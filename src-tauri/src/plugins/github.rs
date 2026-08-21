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

pub fn split_selection(entry: &str) -> (&str, Vec<String>) {
    match entry.split_once('#') {
        Some((source, authors)) => (
            source,
            authors
                .split(',')
                .map(str::trim)
                .filter(|a| !a.is_empty())
                .map(str::to_ascii_lowercase)
                .collect(),
        ),
        None => (entry, Vec::new()),
    }
}

fn wanted(author: Option<&String>, authors: &[String]) -> bool {
    authors.is_empty()
        || author
            .map(|login| authors.contains(&login.to_ascii_lowercase()))
            .unwrap_or(false)
}

pub fn parse_items(body: &Value, source: &str, authors: &[String]) -> Vec<PluginItem> {
    body.as_array()
        .map(|pulls| {
            pulls
                .iter()
                .filter_map(|pull| {
                    let number = pull.get("number").and_then(Value::as_i64)?;
                    let draft = pull.get("draft").and_then(Value::as_bool).unwrap_or(false);
                    let author = nested(pull, &["user", "login"]);
                    if !wanted(author.as_ref(), authors) {
                        return None;
                    }
                    let branch = nested(pull, &["head", "ref"]);
                    Some(PluginItem {
                        id: format!("github:{}:{}", source, number),
                        source: source.to_string(),
                        source_id: Some(source.to_string()),
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

pub async fn items(token: &str, entry: &str) -> Result<Vec<PluginItem>, String> {
    let (source, authors) = split_selection(entry);
    let (owner, repo) = source
        .split_once('/')
        .ok_or_else(|| format!("malformed repository '{}'", source))?;
    let path = format!(
        "/repos/{}/{}/pulls?state=open&sort=updated&direction=desc&per_page=50",
        urlencoding::encode(owner),
        urlencoding::encode(repo)
    );
    Ok(parse_items(&get(token, &path).await?, source, &authors))
}

pub fn parse_members(body: &Value) -> Vec<PluginSource> {
    body.as_array()
        .map(|users| {
            users
                .iter()
                .filter_map(|user| {
                    let login = text(user, "login")?;
                    let contributions = user
                        .get("contributions")
                        .and_then(Value::as_i64)
                        .map(|n| format!("{} commits", n));
                    Some(PluginSource {
                        id: login.clone(),
                        name: login,
                        detail: contributions,
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

pub async fn members(token: &str, entry: &str) -> Result<Vec<PluginSource>, String> {
    let (source, _) = split_selection(entry);
    let (owner, repo) = source
        .split_once('/')
        .ok_or_else(|| format!("malformed repository '{}'", source))?;
    let path = format!(
        "/repos/{}/{}/contributors?per_page=50",
        urlencoding::encode(owner),
        urlencoding::encode(repo)
    );
    Ok(parse_members(&get(token, &path).await?))
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
        let items = parse_items(&body, "acme/web", &[]);
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
        let items = parse_items(&body, "acme/web", &[]);
        assert_eq!(items[0].status, "draft");
        assert_eq!(items[0].tone, Tone::Neutral);
        assert_eq!(items[0].meta.as_deref(), Some("#7"));
    }

    #[test]
    fn selection_splits_into_repository_and_authors() {
        assert_eq!(split_selection("acme/web"), ("acme/web", vec![]));
        assert_eq!(
            split_selection("acme/web#Wynter, bob,"),
            ("acme/web", vec!["wynter".to_string(), "bob".to_string()])
        );
        assert_eq!(split_selection("acme/web#"), ("acme/web", vec![]));
    }

    #[test]
    fn author_filter_keeps_only_the_watched_users() {
        let body = serde_json::json!([
            { "number": 1, "title": "mine", "user": { "login": "Wynter" } },
            { "number": 2, "title": "theirs", "user": { "login": "someone" } },
            { "number": 3, "title": "ghost" }
        ]);
        let filtered = parse_items(&body, "acme/web", &["wynter".to_string()]);
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].title, "mine");
        assert_eq!(parse_items(&body, "acme/web", &[]).len(), 3);
    }

    #[test]
    fn contributors_become_selectable_members() {
        let body = serde_json::json!([
            { "login": "wynter", "contributions": 120 },
            { "contributions": 3 }
        ]);
        let members = parse_members(&body);
        assert_eq!(members.len(), 1);
        assert_eq!(members[0].id, "wynter");
        assert_eq!(members[0].detail.as_deref(), Some("120 commits"));
    }

    #[test]
    fn pull_request_without_a_number_is_skipped() {
        let body = serde_json::json!([{ "title": "broken" }]);
        assert!(parse_items(&body, "acme/web", &[]).is_empty());
    }

    #[test]
    fn item_ids_stay_unique_across_repositories() {
        let body = serde_json::json!([{ "number": 1, "title": "same" }]);
        let a = parse_items(&body, "acme/web", &[]);
        let b = parse_items(&body, "acme/api", &[]);
        assert_ne!(a[0].id, b[0].id);
    }
}
