use std::io::{BufRead, Write};

use rusqlite::Connection;
use serde_json::{json, Value};

use crate::db;
use crate::models::{Framework, ProjectQuery, ShelfId, SortMode};
use crate::portfolio;

const PROTOCOL_VERSION: &str = "2025-06-18";
const DEFAULT_LIMIT: usize = 40;

fn tools() -> Value {
    json!([
        {
            "name": "list_projects",
            "description": "Search the Workbench catalog of local projects. Returns a summary of each match: id, name, path, framework, language, status, last modified, ship score and tags.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "search": { "type": "string", "description": "Free text matched against name, path, framework and README summary." },
                    "framework": { "type": "string", "description": "Restrict to one framework, e.g. nextjs, vite, chrome-extension, rust." },
                    "status": { "type": "string", "description": "Restrict to one status: runnable, running, in-progress, broken, dead, shipped, unknown." },
                    "limit": { "type": "integer", "description": "Maximum projects to return. Defaults to 40." }
                }
            }
        },
        {
            "name": "get_project",
            "description": "Full detail for one project in the Workbench catalog, including run command, git state, README summary and screenshot paths. Identify it by id, path, or name.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "integer" },
                    "path": { "type": "string" },
                    "name": { "type": "string" }
                }
            }
        },
        {
            "name": "library_stats",
            "description": "Totals across the whole Workbench catalog: project counts by status and by framework, and how many have screenshots.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "get_portfolio",
            "description": "The AI Portfolio for one project: the written markdown piece, the absolute paths of its screenshots, the voice settings, and the notes the owner gave. Use this to publish the project on a site. Identify it by id, path, or name.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "integer" },
                    "path": { "type": "string" },
                    "name": { "type": "string" }
                }
            }
        },
        {
            "name": "add_screenshot",
            "description": "Add a screenshot to a project's Workbench catalog entry and its AI Portfolio. Save the image to disk first, then give this its absolute path and a short label for the area it shows, e.g. 'Dashboard'. Identify the project by id, path or name.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "integer", "description": "Workbench project id." },
                    "path": { "type": "string", "description": "Project folder path." },
                    "name": { "type": "string", "description": "Project name." },
                    "file": { "type": "string", "description": "Absolute path of the png, jpg, gif, webp or avif image to add." },
                    "label": { "type": "string", "description": "Short name for what the shot shows, e.g. 'Dashboard'. Reusing a label replaces that shot." }
                },
                "required": ["file", "label"]
            }
        },
        {
            "name": "list_portfolios",
            "description": "Every project that has a written AI Portfolio piece, with its title, screenshot count and word count. Start here when building a portfolio site.",
            "inputSchema": { "type": "object", "properties": {} }
        }
    ])
}

fn summary(project: &crate::models::Project) -> Value {
    json!({
        "id": project.id,
        "name": project.name,
        "path": project.path,
        "framework": project.framework.as_str(),
        "language": project.language,
        "status": project.status.as_str(),
        "lastModified": project.last_modified,
        "shipScore": project.ship_score,
        "tags": project.tags,
    })
}

fn text_result(value: &Value) -> Value {
    json!({
        "content": [{
            "type": "text",
            "text": serde_json::to_string_pretty(value).unwrap_or_else(|_| "{}".into())
        }]
    })
}

fn string_arg<'a>(args: &'a Value, key: &str) -> Option<&'a str> {
    args.get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
}

fn resolve_project(
    conn: &Connection,
    args: &Value,
    tool: &str,
) -> Result<crate::models::Project, String> {
    let found = if let Some(id) = args.get("id").and_then(Value::as_i64) {
        db::get_project(conn, id).map_err(|e| e.to_string())?
    } else if let Some(path) = string_arg(args, "path") {
        db::list_all_projects(conn)
            .map_err(|e| e.to_string())?
            .into_iter()
            .find(|p| p.path == path)
    } else if let Some(name) = string_arg(args, "name") {
        let lower = name.to_lowercase();
        db::list_all_projects(conn)
            .map_err(|e| e.to_string())?
            .into_iter()
            .find(|p| p.name.to_lowercase() == lower)
    } else {
        return Err(format!("{tool} needs one of id, path or name"));
    };
    found.ok_or_else(|| "no project in the Workbench catalog matches that".to_string())
}

fn image_paths(state: &portfolio::PortfolioState) -> Vec<String> {
    state
        .images
        .iter()
        .map(|name| format!("{}/{name}", state.images_dir))
        .collect()
}

fn doc_title(doc: &str) -> Option<String> {
    doc.lines()
        .find(|line| line.starts_with("# "))
        .map(|line| line.trim_start_matches('#').trim().to_string())
}

pub fn call_tool(conn: &Connection, name: &str, args: &Value) -> Result<Value, String> {
    match name {
        "list_projects" => {
            let query = ProjectQuery {
                shelf: ShelfId::All,
                search: string_arg(args, "search").unwrap_or_default().to_string(),
                frameworks: string_arg(args, "framework")
                    .map(|f| vec![Framework::from_str(f)])
                    .unwrap_or_default(),
                tags: Vec::new(),
                sort: SortMode::Modified,
            };
            let status = string_arg(args, "status").map(str::to_ascii_lowercase);
            let limit = args
                .get("limit")
                .and_then(Value::as_u64)
                .map(|n| n as usize)
                .unwrap_or(DEFAULT_LIMIT);

            let projects = db::list_projects(conn, &query).map_err(|e| e.to_string())?;
            let matched: Vec<Value> = projects
                .iter()
                .filter(|p| match &status {
                    Some(want) => p.status.as_str() == want,
                    None => true,
                })
                .take(limit)
                .map(summary)
                .collect();

            Ok(text_result(
                &json!({ "count": matched.len(), "projects": matched }),
            ))
        }
        "get_project" => {
            let project = resolve_project(conn, args, "get_project")?;
            Ok(text_result(
                &serde_json::to_value(&project).map_err(|e| e.to_string())?,
            ))
        }
        "get_portfolio" => {
            let project = resolve_project(conn, args, "get_portfolio")?;
            let state = portfolio::portfolio_state(project.id)?;
            if state.doc.trim().is_empty() && state.images.is_empty() {
                return Err(format!(
                    "{} has no AI Portfolio yet — open it in Workbench and write one",
                    project.name
                ));
            }
            Ok(text_result(&json!({
                "project": summary(&project),
                "homepage": project.homepage,
                "doc": state.doc,
                "images": image_paths(&state),
                "voice": state.voice,
                "notes": state.messages,
            })))
        }
        "add_screenshot" => {
            let project = resolve_project(conn, args, "add_screenshot")?;
            let file = string_arg(args, "file")
                .ok_or("add_screenshot needs `file`, the path of an image already saved on disk")?;
            let label = string_arg(args, "label")
                .ok_or("add_screenshot needs `label`, a short name for what the shot shows")?;
            let name = portfolio::import_labelled_image(project.id, file, label)?;
            Ok(text_result(&json!({
                "project": project.name,
                "label": label,
                "saved": format!("{}/{name}", portfolio::images_dir(project.id).display()),
            })))
        }
        "list_portfolios" => {
            let written: Vec<Value> = db::list_all_projects(conn)
                .map_err(|e| e.to_string())?
                .into_iter()
                .filter_map(|project| {
                    let state = portfolio::portfolio_state(project.id).ok()?;
                    if state.doc.trim().is_empty() {
                        return None;
                    }
                    Some(json!({
                        "id": project.id,
                        "name": project.name,
                        "path": project.path,
                        "title": doc_title(&state.doc).unwrap_or(project.name.clone()),
                        "words": state.doc.split_whitespace().count(),
                        "images": state.images.len(),
                    }))
                })
                .collect();
            Ok(text_result(
                &json!({ "count": written.len(), "portfolios": written }),
            ))
        }
        "library_stats" => {
            let stats = db::library_stats(conn).map_err(|e| e.to_string())?;
            Ok(text_result(
                &serde_json::to_value(&stats).map_err(|e| e.to_string())?,
            ))
        }
        other => Err(format!("unknown tool '{other}'")),
    }
}

fn error(id: Value, code: i64, message: String) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

fn ok(id: Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

pub fn handle_message(conn: &Connection, message: &Value) -> Option<Value> {
    let id = message.get("id").cloned();
    let method = message.get("method").and_then(Value::as_str).unwrap_or("");
    let id = id?;

    match method {
        "initialize" => {
            let version = message
                .get("params")
                .and_then(|p| p.get("protocolVersion"))
                .and_then(Value::as_str)
                .unwrap_or(PROTOCOL_VERSION)
                .to_string();
            Some(ok(
                id,
                json!({
                    "protocolVersion": version,
                    "capabilities": { "tools": {} },
                    "serverInfo": { "name": "workbench", "version": env!("CARGO_PKG_VERSION") }
                }),
            ))
        }
        "ping" => Some(ok(id, json!({}))),
        "tools/list" => Some(ok(id, json!({ "tools": tools() }))),
        "tools/call" => {
            let params = message.get("params").cloned().unwrap_or_else(|| json!({}));
            let name = params.get("name").and_then(Value::as_str).unwrap_or("");
            let args = params
                .get("arguments")
                .cloned()
                .unwrap_or_else(|| json!({}));
            match call_tool(conn, name, &args) {
                Ok(result) => Some(ok(id, result)),
                Err(message) => Some(ok(
                    id,
                    json!({
                        "content": [{ "type": "text", "text": message }],
                        "isError": true
                    }),
                )),
            }
        }
        other => Some(error(id, -32601, format!("method '{other}' not supported"))),
    }
}

pub fn serve() -> Result<(), String> {
    let conn = db::open()?;
    let stdin = std::io::stdin();
    let mut stdout = std::io::stdout();

    for line in stdin.lock().lines() {
        let line = line.map_err(|e| e.to_string())?;
        if line.trim().is_empty() {
            continue;
        }
        let Ok(message) = serde_json::from_str::<Value>(&line) else {
            continue;
        };
        if let Some(response) = handle_message(&conn, &message) {
            writeln!(stdout, "{}", response).map_err(|e| e.to_string())?;
            stdout.flush().map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{NewProjectInput, PackageManager};

    fn db_with_project() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        db::run_migrations(&conn).unwrap();
        db::upsert_project(
            &conn,
            &NewProjectInput {
                path: "/tmp/olgarcade".into(),
                name: "OLGArcade".into(),
                framework: Framework::ChromeExtension,
                language: Some("JavaScript".into()),
                package_manager: PackageManager::None,
                last_modified: "2026-08-01T00:00:00Z".into(),
                git_branch: None,
                git_remote: None,
                git_dirty: false,
                last_commit_at: None,
                loc: 1910,
                readme_summary: Some("A Manifest V3 Chrome extension".into()),
                run_cmd: None,
                run_url: None,
                port: None,
                status: crate::models::ProjectStatus::Unknown,
                deps_installed: false,
                has_env_example: false,
                homepage: None,
            },
        )
        .unwrap();
        conn
    }

    fn request(method: &str, params: Value) -> Value {
        json!({ "jsonrpc": "2.0", "id": 1, "method": method, "params": params })
    }

    fn tool_text(response: &Value) -> String {
        response["result"]["content"][0]["text"]
            .as_str()
            .unwrap()
            .to_string()
    }

    #[test]
    fn initialize_echoes_the_clients_protocol_version() {
        let conn = db_with_project();
        let response = handle_message(
            &conn,
            &request("initialize", json!({ "protocolVersion": "2024-11-05" })),
        )
        .unwrap();
        assert_eq!(response["result"]["protocolVersion"], "2024-11-05");
        assert_eq!(response["result"]["serverInfo"]["name"], "workbench");
    }

    #[test]
    fn notifications_never_get_a_response() {
        let conn = db_with_project();
        let notification = json!({ "jsonrpc": "2.0", "method": "notifications/initialized" });
        assert!(handle_message(&conn, &notification).is_none());
    }

    #[test]
    fn tools_list_advertises_every_tool_with_a_schema() {
        let conn = db_with_project();
        let response = handle_message(&conn, &request("tools/list", json!({}))).unwrap();
        let tools = response["result"]["tools"].as_array().unwrap();
        assert_eq!(tools.len(), 6);
        for tool in tools {
            assert!(tool["name"].is_string());
            assert_eq!(tool["inputSchema"]["type"], "object");
            assert!(!tool["description"].as_str().unwrap().is_empty());
        }
    }

    #[test]
    fn list_projects_filters_by_framework_and_honours_limit() {
        let conn = db_with_project();
        let hit = call_tool(
            &conn,
            "list_projects",
            &json!({ "framework": "chrome-extension" }),
        )
        .unwrap();
        assert!(serde_json::to_string(&hit).unwrap().contains("OLGArcade"));

        let miss = call_tool(&conn, "list_projects", &json!({ "framework": "rails" })).unwrap();
        assert!(miss["content"][0]["text"]
            .as_str()
            .unwrap()
            .contains("\"count\": 0"));

        let capped = call_tool(&conn, "list_projects", &json!({ "limit": 0 })).unwrap();
        assert!(capped["content"][0]["text"]
            .as_str()
            .unwrap()
            .contains("\"count\": 0"));
    }

    #[test]
    fn get_project_resolves_by_name_or_path_and_reports_misses() {
        let conn = db_with_project();
        let by_name = call_tool(&conn, "get_project", &json!({ "name": "olgarcade" })).unwrap();
        assert!(by_name["content"][0]["text"]
            .as_str()
            .unwrap()
            .contains("/tmp/olgarcade"));

        let by_path =
            call_tool(&conn, "get_project", &json!({ "path": "/tmp/olgarcade" })).unwrap();
        assert!(by_path["content"][0]["text"]
            .as_str()
            .unwrap()
            .contains("OLGArcade"));

        assert!(call_tool(&conn, "get_project", &json!({ "name": "nope" })).is_err());
        assert!(call_tool(&conn, "get_project", &json!({})).is_err());
    }

    #[test]
    fn a_failing_tool_call_comes_back_as_an_error_result_not_a_protocol_error() {
        let conn = db_with_project();
        let response = handle_message(
            &conn,
            &request(
                "tools/call",
                json!({ "name": "get_project", "arguments": { "id": 999 } }),
            ),
        )
        .unwrap();
        assert_eq!(response["result"]["isError"], true);
        assert!(response["error"].is_null());
    }

    #[test]
    fn unknown_methods_get_a_jsonrpc_error() {
        let conn = db_with_project();
        let response = handle_message(&conn, &request("resources/list", json!({}))).unwrap();
        assert_eq!(response["error"]["code"], -32601);
    }

    #[test]
    fn library_stats_round_trips_through_a_tool_call() {
        let conn = db_with_project();
        let stats = call_tool(&conn, "library_stats", &json!({})).unwrap();
        assert!(tool_text(&json!({ "result": stats })).contains("total"));
    }
}
