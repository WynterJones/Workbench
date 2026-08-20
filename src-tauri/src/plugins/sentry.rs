use serde_json::Value;

use super::{client, nested, read_json, text, PluginItem, PluginSource, Tone};

const BASE: &str = "https://sentry.io/api/0";

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

#[cfg(test)]
mod tests {
    use super::*;

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
