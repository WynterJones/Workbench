mod github;
mod railway;
mod sentry;
mod store;

use std::sync::OnceLock;

use serde::Serialize;
use serde_json::Value;
use tauri::State;

use crate::db::DbState;
pub use store::{PluginState, PLUGIN_IDS};

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PluginSource {
    pub id: String,
    pub name: String,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PluginItem {
    pub id: String,
    pub source: String,
    pub title: String,
    pub subtitle: String,
    pub status: String,
    pub tone: Tone,
    pub url: Option<String>,
    pub timestamp: Option<String>,
    pub meta: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Tone {
    Good,
    Bad,
    Warn,
    Neutral,
}

pub fn text(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::to_string)
        .filter(|s| !s.is_empty())
}

pub fn nested(value: &Value, path: &[&str]) -> Option<String> {
    let mut cursor = value;
    for (i, key) in path.iter().enumerate() {
        if i + 1 == path.len() {
            return text(cursor, key);
        }
        cursor = cursor.get(key)?;
    }
    None
}

pub fn client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .user_agent("Workbench")
            .build()
            .expect("failed to build http client")
    })
}

pub async fn read_json(response: reqwest::Response) -> Result<Value, String> {
    let status = response.status();
    let body = response.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(api_error(status, &body));
    }
    serde_json::from_str(&body).map_err(|e| e.to_string())
}

fn api_error(status: reqwest::StatusCode, body: &str) -> String {
    let detail = serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|v| text(&v, "detail").or_else(|| text(&v, "message")))
        .unwrap_or_else(|| body.chars().take(160).collect());
    match status.as_u16() {
        401 | 403 => format!("Access denied ({}). Check the token and its scopes.", status.as_u16()),
        404 => "Not found. The project or repository may have been renamed.".into(),
        429 => "Rate limited by the API. Try again shortly.".into(),
        _ => format!("{} — {}", status.as_u16(), detail),
    }
}

const MAX_SOURCES: usize = 12;

fn credential(id: &str) -> Result<String, String> {
    store::read_credential(id)
        .ok_or_else(|| "No API token saved for this plugin yet.".to_string())
}

#[tauri::command]
pub fn list_plugins(state: State<DbState>) -> Result<Vec<PluginState>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    PLUGIN_IDS
        .iter()
        .map(|id| store::state_for(&conn, id))
        .collect()
}

#[tauri::command]
pub fn set_plugin_enabled(
    state: State<DbState>,
    id: String,
    enabled: bool,
) -> Result<PluginState, String> {
    store::is_known(&id)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    store::write_enabled(&conn, &id, enabled).map_err(|e| e.to_string())?;
    store::state_for(&conn, &id)
}

#[tauri::command]
pub fn set_plugin_credential(
    state: State<DbState>,
    id: String,
    token: String,
) -> Result<PluginState, String> {
    store::is_known(&id)?;
    store::write_credential(&id, token.trim())?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    store::state_for(&conn, &id)
}

#[tauri::command]
pub fn set_plugin_selection(
    state: State<DbState>,
    id: String,
    selected: Vec<String>,
) -> Result<PluginState, String> {
    store::is_known(&id)?;
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    store::write_selected(&conn, &id, &selected).map_err(|e| e.to_string())?;
    store::state_for(&conn, &id)
}

#[tauri::command]
pub async fn plugin_sources(id: String) -> Result<Vec<PluginSource>, String> {
    store::is_known(&id)?;
    let token = credential(&id)?;
    match id.as_str() {
        "railway" => railway::sources(&token).await,
        "sentry" => sentry::sources(&token).await,
        "github-pulls" => github::sources(&token).await,
        _ => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn plugin_items(state: State<'_, DbState>, id: String) -> Result<Vec<PluginItem>, String> {
    store::is_known(&id)?;
    let selected = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        store::read_row(&conn, &id).map_err(|e| e.to_string())?.1
    };
    let token = credential(&id)?;

    let mut items = Vec::new();
    let mut failure = None;
    for source in selected.iter().take(MAX_SOURCES) {
        let result = match id.as_str() {
            "railway" => railway::items(&token, source).await,
            "sentry" => sentry::items(&token, source).await,
            "github-pulls" => github::items(&token, source).await,
            _ => Ok(Vec::new()),
        };
        match result {
            Ok(mut found) => items.append(&mut found),
            Err(error) => failure = failure.or(Some(error)),
        }
    }

    match failure {
        Some(error) if items.is_empty() => Err(error),
        _ => Ok(items),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nested_walks_object_paths() {
        let value: Value = serde_json::json!({ "user": { "login": "wynter" }, "empty": "" });
        assert_eq!(nested(&value, &["user", "login"]), Some("wynter".into()));
        assert_eq!(nested(&value, &["user", "missing"]), None);
        assert_eq!(nested(&value, &["nope", "login"]), None);
        assert_eq!(nested(&value, &["empty"]), None);
    }

    #[test]
    fn auth_failures_get_an_actionable_message() {
        let message = api_error(reqwest::StatusCode::UNAUTHORIZED, "{}");
        assert!(message.contains("token"), "got: {}", message);
        assert!(api_error(reqwest::StatusCode::TOO_MANY_REQUESTS, "").contains("Rate limited"));
    }

    #[test]
    fn api_errors_never_echo_a_whole_response_body() {
        let huge = "x".repeat(5000);
        let message = api_error(reqwest::StatusCode::INTERNAL_SERVER_ERROR, &huge);
        assert!(message.len() < 200);
    }
}
