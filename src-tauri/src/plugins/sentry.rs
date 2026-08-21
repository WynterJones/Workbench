use serde_json::Value;

use super::{
    client, nested, nested_array, read_json, text, PluginItem, PluginItemDetail, PluginSource, Tone,
};

const BASE: &str = "https://sentry.io/api/0";
const MAX_FRAMES: usize = 12;
const MAX_TAGS: usize = 10;

pub fn parse_sources(body: &Value) -> Vec<PluginSource> {
    body.as_array()
        .map(|projects| {
            projects
                .iter()
                .filter_map(|project| {
                    let slug = text(project, "slug")?;
                    let org = nested(project, &["organization", "slug"])?;
                    Some(PluginSource {
                        id: format!("{}/{}", org, slug),
                        name: text(project, "name").unwrap_or_else(|| slug.clone()),
                        detail: Some(org),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

pub fn tone_for(level: &str) -> Tone {
    match level.to_ascii_lowercase().as_str() {
        "fatal" | "error" => Tone::Bad,
        "warning" => Tone::Warn,
        _ => Tone::Neutral,
    }
}

pub fn format_count(raw: &str) -> String {
    let count: f64 = raw.parse().unwrap_or(0.0);
    if count >= 1000.0 {
        format!("{:.1}k events", count / 1000.0)
    } else if count == 1.0 {
        "1 event".into()
    } else {
        format!("{} events", count as i64)
    }
}

pub fn parse_items(body: &Value, source: &str) -> Vec<PluginItem> {
    body.as_array()
        .map(|issues| {
            issues
                .iter()
                .filter_map(|issue| {
                    let level = text(issue, "level").unwrap_or_else(|| "error".into());
                    let count = text(issue, "count").map(|raw| format_count(&raw));
                    Some(PluginItem {
                        id: format!("sentry:{}", text(issue, "id")?),
                        source: source.to_string(),
                        source_id: Some(source.to_string()),
                        title: text(issue, "title").unwrap_or_else(|| "Unknown error".into()),
                        subtitle: text(issue, "culprit").unwrap_or_default(),
                        status: level.clone(),
                        tone: tone_for(&level),
                        url: text(issue, "permalink"),
                        timestamp: text(issue, "lastSeen"),
                        meta: count,
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

async fn get(token: &str, path: &str) -> Result<Value, String> {
    let response = client()
        .get(format!("{}{}", BASE, path))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    read_json(response).await
}

pub async fn sources(token: &str) -> Result<Vec<PluginSource>, String> {
    Ok(parse_sources(&get(token, "/projects/").await?))
}

pub async fn items(token: &str, source: &str) -> Result<Vec<PluginItem>, String> {
    let (org, project) = source
        .split_once('/')
        .ok_or_else(|| format!("malformed Sentry project '{}'", source))?;
    let path = format!(
        "/projects/{}/{}/issues/?query=is:unresolved&statsPeriod=14d&limit=25",
        urlencoding::encode(org),
        urlencoding::encode(project)
    );
    Ok(parse_items(&get(token, &path).await?, source))
}

fn entry<'a>(body: &'a Value, kind: &str) -> Option<&'a Value> {
    body.get("entries")?
        .as_array()?
        .iter()
        .find(|e| e.get("type").and_then(Value::as_str) == Some(kind))
        .and_then(|e| e.get("data"))
}

fn frame_line(frame: &Value) -> Option<String> {
    let file = text(frame, "filename")
        .or_else(|| text(frame, "absPath"))
        .or_else(|| text(frame, "module"))?;
    let function = text(frame, "function").unwrap_or_else(|| "?".into());
    match frame.get("lineNo").and_then(Value::as_i64) {
        Some(line) => Some(format!("{} in {} at line {}", file, function, line)),
        None => Some(format!("{} in {}", file, function)),
    }
}

pub fn parse_event_detail(body: &Value) -> PluginItemDetail {
    let exception = entry(body, "exception")
        .and_then(|data| data.get("values"))
        .and_then(Value::as_array)
        .and_then(|values| values.last());

    let summary = exception
        .and_then(|value| {
            let kind = text(value, "type")?;
            Some(match text(value, "value") {
                Some(message) => format!("{}: {}", kind, message),
                None => kind,
            })
        })
        .or_else(|| text(body, "message"))
        .or_else(|| text(body, "title"))
        .unwrap_or_else(|| "No exception details in the latest event.".into());

    let all_frames: Vec<&Value> = exception
        .and_then(|value| nested_array(value, &["stacktrace", "frames"]))
        .unwrap_or_default();
    let in_app: Vec<&Value> = all_frames
        .iter()
        .filter(|f| f.get("inApp").and_then(Value::as_bool) == Some(true))
        .copied()
        .collect();
    let chosen = if in_app.is_empty() {
        all_frames
    } else {
        in_app
    };
    let frames: Vec<String> = chosen
        .iter()
        .rev()
        .take(MAX_FRAMES)
        .filter_map(|frame| frame_line(frame))
        .collect();

    let request = entry(body, "request").and_then(|data| {
        let url = text(data, "url")?;
        Some(match text(data, "method") {
            Some(method) => format!("{} {}", method, url),
            None => url,
        })
    });

    let tags = body
        .get("tags")
        .and_then(Value::as_array)
        .map(|tags| {
            tags.iter()
                .filter_map(|tag| Some(format!("{}={}", text(tag, "key")?, text(tag, "value")?)))
                .take(MAX_TAGS)
                .collect()
        })
        .unwrap_or_default();

    PluginItemDetail {
        summary,
        frames,
        request,
        tags,
        occurred: text(body, "dateCreated"),
    }
}

pub async fn issue_detail(token: &str, issue_id: &str) -> Result<PluginItemDetail, String> {
    let path = format!("/issues/{}/events/latest/", urlencoding::encode(issue_id));
    Ok(parse_event_detail(&get(token, &path).await?))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event() -> Value {
        serde_json::json!({
            "dateCreated": "2026-08-20T10:00:00Z",
            "message": "fallback message",
            "tags": [{ "key": "browser", "value": "Chrome 138" }, { "key": "url", "value": "" }],
            "entries": [
                { "type": "request", "data": { "url": "https://acme.dev/checkout", "method": "POST" } },
                { "type": "exception", "data": { "values": [{
                    "type": "TypeError",
                    "value": "null is not an object",
                    "stacktrace": { "frames": [
                        { "filename": "vendor.js", "function": "boot", "lineNo": 1, "inApp": false },
                        { "filename": "app/cart.ts", "function": "total", "lineNo": 42, "inApp": true },
                        { "filename": "app/checkout.ts", "function": "submit", "lineNo": 9, "inApp": true }
                    ]}
                }]}}
            ]
        })
    }

    #[test]
    fn detail_summarises_the_exception() {
        let detail = parse_event_detail(&event());
        assert_eq!(detail.summary, "TypeError: null is not an object");
        assert_eq!(
            detail.request.as_deref(),
            Some("POST https://acme.dev/checkout")
        );
        assert_eq!(detail.tags, vec!["browser=Chrome 138"]);
        assert_eq!(detail.occurred.as_deref(), Some("2026-08-20T10:00:00Z"));
    }

    #[test]
    fn frames_are_in_app_only_and_crash_site_first() {
        let detail = parse_event_detail(&event());
        assert_eq!(detail.frames.len(), 2);
        assert_eq!(detail.frames[0], "app/checkout.ts in submit at line 9");
        assert_eq!(detail.frames[1], "app/cart.ts in total at line 42");
    }

    #[test]
    fn frames_fall_back_to_every_frame_when_none_are_in_app() {
        let body = serde_json::json!({ "entries": [{ "type": "exception", "data": { "values": [{
            "type": "Error", "value": "boom",
            "stacktrace": { "frames": [{ "filename": "vendor.js", "function": "boot", "lineNo": 1 }] }
        }]}}]});
        assert_eq!(
            parse_event_detail(&body).frames,
            vec!["vendor.js in boot at line 1"]
        );
    }

    #[test]
    fn an_event_without_an_exception_still_yields_a_summary() {
        let detail = parse_event_detail(&serde_json::json!({ "message": "job timed out" }));
        assert_eq!(detail.summary, "job timed out");
        assert!(detail.frames.is_empty());
        assert!(detail.request.is_none());
    }

    #[test]
    fn source_id_pairs_org_and_project() {
        let body = serde_json::json!([
            { "slug": "web", "name": "Web", "organization": { "slug": "acme" } },
            { "slug": "api", "name": "API", "organization": { "slug": "acme" } }
        ]);
        let sources = parse_sources(&body);
        assert_eq!(sources[0].id, "acme/web");
        assert_eq!(sources[1].id, "acme/api");
        assert_eq!(sources[0].detail.as_deref(), Some("acme"));
    }

    #[test]
    fn project_without_an_organization_is_skipped() {
        let body = serde_json::json!([{ "slug": "orphan", "name": "Orphan" }]);
        assert!(parse_sources(&body).is_empty());
    }

    #[test]
    fn issue_level_maps_to_tone() {
        assert_eq!(tone_for("error"), Tone::Bad);
        assert_eq!(tone_for("fatal"), Tone::Bad);
        assert_eq!(tone_for("warning"), Tone::Warn);
        assert_eq!(tone_for("info"), Tone::Neutral);
    }

    #[test]
    fn event_counts_are_humanised() {
        assert_eq!(format_count("1"), "1 event");
        assert_eq!(format_count("42"), "42 events");
        assert_eq!(format_count("12400"), "12.4k events");
        assert_eq!(format_count("garbage"), "0 events");
    }

    #[test]
    fn parses_issues_into_items() {
        let body = serde_json::json!([{
            "id": "99",
            "title": "TypeError: undefined is not a function",
            "culprit": "app/routes/checkout",
            "level": "error",
            "count": "1500",
            "lastSeen": "2026-08-19T09:00:00Z",
            "permalink": "https://sentry.io/organizations/acme/issues/99/"
        }]);
        let items = parse_items(&body, "acme/web");
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].source, "acme/web");
        assert_eq!(items[0].subtitle, "app/routes/checkout");
        assert_eq!(items[0].meta.as_deref(), Some("1.5k events"));
        assert_eq!(items[0].tone, Tone::Bad);
    }

    #[test]
    fn unexpected_payload_shape_yields_no_items() {
        assert!(parse_items(&serde_json::json!({ "detail": "nope" }), "acme/web").is_empty());
        assert!(parse_sources(&serde_json::json!({})).is_empty());
    }
}
