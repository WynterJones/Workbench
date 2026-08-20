use serde_json::{json, Value};

use super::{client, nested, read_json, text, PluginItem, PluginSource, Tone};

const ENDPOINT: &str = "https://backboard.railway.com/graphql/v2";

const PROJECTS_QUERY: &str = r#"
query { me { projects { edges { node { id name } } } } }
"#;

const DEPLOYMENTS_QUERY: &str = r#"
query($id: String!) {
  project(id: $id) {
    name
    deployments(first: 5) {
      edges {
        node {
          id
          status
          createdAt
          staticUrl
          service { name }
          environment { name }
        }
      }
    }
  }
}
"#;

async fn graphql(token: &str, query: &str, variables: Value) -> Result<Value, String> {
    let response = client()
        .post(ENDPOINT)
        .bearer_auth(token)
        .json(&json!({ "query": query, "variables": variables }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let body = read_json(response).await?;
    if let Some(message) = first_graphql_error(&body) {
        return Err(message);
    }
    body.get("data").cloned().ok_or_else(|| "Railway returned no data.".into())
}

fn first_graphql_error(body: &Value) -> Option<String> {
    let errors = body.get("errors")?.as_array()?;
    let first = errors.first()?;
    Some(text(first, "message").unwrap_or_else(|| "Railway rejected the query.".into()))
}

fn edges(value: &Value) -> Vec<Value> {
    value
        .get("edges")
        .and_then(Value::as_array)
        .map(|edges| edges.iter().filter_map(|e| e.get("node").cloned()).collect())
        .unwrap_or_default()
}

pub fn parse_sources(data: &Value) -> Vec<PluginSource> {
    let projects = match data.get("me").and_then(|me| me.get("projects")) {
        Some(projects) => projects,
        None => return Vec::new(),
    };
    edges(projects)
        .iter()
        .filter_map(|node| {
            Some(PluginSource {
                id: text(node, "id")?,
                name: text(node, "name").unwrap_or_else(|| "Untitled project".into()),
                detail: None,
            })
        })
        .collect()
}

pub fn tone_for(status: &str) -> Tone {
    match status.to_ascii_uppercase().as_str() {
        "SUCCESS" => Tone::Good,
        "FAILED" | "CRASHED" => Tone::Bad,
        "BUILDING" | "DEPLOYING" | "INITIALIZING" | "QUEUED" | "WAITING" | "NEEDS_APPROVAL" => {
            Tone::Warn
        }
        _ => Tone::Neutral,
    }
}

pub fn parse_items(data: &Value, project_id: &str) -> Vec<PluginItem> {
    let project = match data.get("project") {
        Some(project) if !project.is_null() => project,
        _ => return Vec::new(),
    };
    let source = text(project, "name").unwrap_or_else(|| project_id.to_string());
    let deployments = match project.get("deployments") {
        Some(deployments) => deployments,
        None => return Vec::new(),
    };

    edges(deployments)
        .iter()
        .filter_map(|node| {
            let status = text(node, "status").unwrap_or_else(|| "UNKNOWN".into());
            let service = nested(node, &["service", "name"]).unwrap_or_else(|| "service".into());
            let environment = nested(node, &["environment", "name"]);
            Some(PluginItem {
                id: format!("railway:{}", text(node, "id")?),
                source: source.clone(),
                title: service,
                subtitle: environment.clone().unwrap_or_else(|| "deployment".into()),
                status: status.to_ascii_lowercase(),
                tone: tone_for(&status),
                url: text(node, "staticUrl").map(|host| format!("https://{}", host)),
                timestamp: text(node, "createdAt"),
                meta: environment,
            })
        })
        .collect()
}

pub async fn sources(token: &str) -> Result<Vec<PluginSource>, String> {
    let data = graphql(token, PROJECTS_QUERY, json!({})).await?;
    Ok(parse_sources(&data))
}

pub async fn items(token: &str, project_id: &str) -> Result<Vec<PluginItem>, String> {
    let data = graphql(token, DEPLOYMENTS_QUERY, json!({ "id": project_id })).await?;
    Ok(parse_items(&data, project_id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_projects_from_a_graphql_connection() {
        let data = serde_json::json!({
            "me": { "projects": { "edges": [
                { "node": { "id": "p1", "name": "storefront" } },
                { "node": { "id": "p2", "name": "api" } }
            ]}}
        });
        let sources = parse_sources(&data);
        assert_eq!(sources.len(), 2);
        assert_eq!(sources[0].id, "p1");
        assert_eq!(sources[1].name, "api");
    }

    #[test]
    fn missing_projects_yields_no_sources_instead_of_panicking() {
        assert!(parse_sources(&serde_json::json!({})).is_empty());
        assert!(parse_sources(&serde_json::json!({ "me": null })).is_empty());
    }

    #[test]
    fn deployment_status_maps_to_tone() {
        assert_eq!(tone_for("SUCCESS"), Tone::Good);
        assert_eq!(tone_for("success"), Tone::Good);
        assert_eq!(tone_for("CRASHED"), Tone::Bad);
        assert_eq!(tone_for("FAILED"), Tone::Bad);
        assert_eq!(tone_for("BUILDING"), Tone::Warn);
        assert_eq!(tone_for("REMOVED"), Tone::Neutral);
    }

    #[test]
    fn parses_deployments_with_service_and_environment() {
        let data = serde_json::json!({
            "project": {
                "name": "storefront",
                "deployments": { "edges": [{ "node": {
                    "id": "d1",
                    "status": "SUCCESS",
                    "createdAt": "2026-08-19T10:00:00Z",
                    "staticUrl": "storefront.up.railway.app",
                    "service": { "name": "web" },
                    "environment": { "name": "production" }
                }}]}
            }
        });
        let items = parse_items(&data, "p1");
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].source, "storefront");
        assert_eq!(items[0].title, "web");
        assert_eq!(items[0].meta.as_deref(), Some("production"));
        assert_eq!(items[0].tone, Tone::Good);
        assert_eq!(items[0].url.as_deref(), Some("https://storefront.up.railway.app"));
    }

    #[test]
    fn deployment_without_static_url_has_no_link() {
        let data = serde_json::json!({
            "project": { "name": "api", "deployments": { "edges": [{ "node": {
                "id": "d2", "status": "FAILED", "service": { "name": "worker" }
            }}]}}
        });
        let items = parse_items(&data, "p2");
        assert_eq!(items[0].url, None);
        assert_eq!(items[0].subtitle, "deployment");
        assert_eq!(items[0].tone, Tone::Bad);
    }

    #[test]
    fn graphql_errors_surface_their_message() {
        let body = serde_json::json!({ "errors": [{ "message": "Not Authorized" }] });
        assert_eq!(first_graphql_error(&body).as_deref(), Some("Not Authorized"));
        assert_eq!(first_graphql_error(&serde_json::json!({ "data": {} })), None);
    }
}
