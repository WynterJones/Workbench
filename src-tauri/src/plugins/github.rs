use serde_json::Value;

use super::{client, nested, read_json, text, PluginItem, PluginSource, Tone};

const BASE: &str = "https://api.github.com";

pub fn parse_sources(body: &Value) -> Vec<PluginSource> {
    body.as_array()
        .map(|repos| {
            repos
                .iter()
                .filter_map(|repo| {
                    let full_name = text(repo, "full_name")?;
                    Some(PluginSource {
                        id: full_name.clone(),
                        name: text(repo, "name").unwrap_or_else(|| full_name.clone()),
                        detail: nested(repo, &["owner", "login"]),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

pub fn parse_items(body: &Value, source: &str) -> Vec<PluginItem> {
    body.as_array()
        .map(|pulls| {
            pulls
                .iter()
                .filter_map(|pull| {
                    let number = pull.get("number").and_then(Value::as_i64)?;
                    let draft = pull.get("draft").and_then(Value::as_bool).unwrap_or(false);
                    let author = nested(pull, &["user", "login"]);
                    let branch = nested(pull, &["head", "ref"]);
                    Some(PluginItem {
                        id: format!("github:{}:{}", source, number),
                        source: source.to_string(),
                        title: text(pull, "title").unwrap_or_else(|| format!("#{}", number)),
                        subtitle: branch.unwrap_or_else(|| format!("#{}", number)),
                        status: if draft { "draft".into() } else { "open".into() },
                        tone: if draft { Tone::Neutral } else { Tone::Good },
                        url: text(pull, "html_url"),
                        timestamp: text(pull, "updated_at").or_else(|| text(pull, "created_at")),
                        meta: Some(match author {
                            Some(login) => format!("#{} by {}", number, login),
                            None => format!("#{}", number),
                        }),
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
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    read_json(response).await
}

pub async fn sources(token: &str) -> Result<Vec<PluginSource>, String> {
    let body = get(token, "/user/repos?sort=updated&per_page=100").await?;
    Ok(parse_sources(&body))
}

pub async fn items(token: &str, source: &str) -> Result<Vec<PluginItem>, String> {
    let (owner, repo) = source
        .split_once('/')
        .ok_or_else(|| format!("malformed repository '{}'", source))?;
    let path = format!(
        "/repos/{}/{}/pulls?state=open&sort=updated&direction=desc&per_page=25",
        urlencoding::encode(owner),
        urlencoding::encode(repo)
    );
    Ok(parse_items(&get(token, &path).await?, source))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repositories_use_full_name_as_id() {
        let body = serde_json::json!([
            { "full_name": "acme/web", "name": "web", "owner": { "login": "acme" } }
        ]);
        let sources = parse_sources(&body);
        assert_eq!(sources[0].id, "acme/web");
        assert_eq!(sources[0].name, "web");
        assert_eq!(sources[0].detail.as_deref(), Some("acme"));
    }

    #[test]
    fn parses_open_pull_requests() {
        let body = serde_json::json!([{
            "number": 42,
            "title": "Add plugin framework",
            "draft": false,
            "html_url": "https://github.com/acme/web/pull/42",
            "updated_at": "2026-08-19T12:00:00Z",
            "user": { "login": "wynter" },
            "head": { "ref": "feature/plugins" }
        }]);
        let items = parse_items(&body, "acme/web");
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].title, "Add plugin framework");
        assert_eq!(items[0].subtitle, "feature/plugins");
        assert_eq!(items[0].meta.as_deref(), Some("#42 by wynter"));
        assert_eq!(items[0].status, "open");
        assert_eq!(items[0].tone, Tone::Good);
    }

    #[test]
    fn draft_pull_requests_are_marked_neutral() {
        let body = serde_json::json!([{ "number": 7, "title": "WIP", "draft": true }]);
        let items = parse_items(&body, "acme/web");
        assert_eq!(items[0].status, "draft");
        assert_eq!(items[0].tone, Tone::Neutral);
        assert_eq!(items[0].meta.as_deref(), Some("#7"));
    }

    #[test]
    fn pull_request_without_a_number_is_skipped() {
        let body = serde_json::json!([{ "title": "broken" }]);
        assert!(parse_items(&body, "acme/web").is_empty());
    }

    #[test]
    fn item_ids_stay_unique_across_repositories() {
        let body = serde_json::json!([{ "number": 1, "title": "same" }]);
        let a = parse_items(&body, "acme/web");
        let b = parse_items(&body, "acme/api");
        assert_ne!(a[0].id, b[0].id);
    }
}
