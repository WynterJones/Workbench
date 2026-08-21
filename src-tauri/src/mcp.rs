use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

use serde::Serialize;

#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub agent: String,
    pub scope: String,
    pub project: Option<String>,
    pub transport: String,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub url: Option<String>,
    pub env_keys: Vec<String>,
    pub source: String,
}

fn redacted_env(value: &serde_json::Value) -> Vec<String> {
    value
        .as_object()
        .map(|map| map.keys().cloned().collect())
        .unwrap_or_default()
}

fn transport_of(entry: &serde_json::Value) -> String {
    if entry.get("url").is_some() {
        entry
            .get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("http")
            .to_string()
    } else {
        "stdio".to_string()
    }
}

pub fn parse_claude_servers(raw: &str) -> Vec<McpServer> {
    let Ok(root) = serde_json::from_str::<serde_json::Value>(raw) else {
        return Vec::new();
    };
    let mut servers = Vec::new();

    let mut push = |name: &str, entry: &serde_json::Value, scope: &str, project: Option<String>| {
        servers.push(McpServer {
            id: format!(
                "claude-code:{}:{name}",
                project.clone().unwrap_or_else(|| "global".into())
            ),
            name: name.to_string(),
            agent: "claude-code".to_string(),
            scope: scope.to_string(),
            project,
            transport: transport_of(entry),
            command: entry
                .get("command")
                .and_then(|c| c.as_str())
                .map(String::from),
            args: entry
                .get("args")
                .and_then(|a| a.as_array())
                .map(|a| {
                    a.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default(),
            url: entry.get("url").and_then(|u| u.as_str()).map(String::from),
            env_keys: entry.get("env").map(redacted_env).unwrap_or_default(),
            source: "~/.claude.json".to_string(),
        });
    };

    if let Some(global) = root.get("mcpServers").and_then(|m| m.as_object()) {
        for (name, entry) in global {
            push(name, entry, "global", None);
        }
    }

    if let Some(projects) = root.get("projects").and_then(|p| p.as_object()) {
        for (path, config) in projects {
            let Some(map) = config.get("mcpServers").and_then(|m| m.as_object()) else {
                continue;
            };
            for (name, entry) in map {
                push(name, entry, "project", Some(path.clone()));
            }
        }
    }

    servers
}

pub fn parse_codex_servers(raw: &str) -> Vec<McpServer> {
    let mut servers: BTreeMap<String, McpServer> = BTreeMap::new();
    let mut current: Option<String> = None;
    let mut in_env = false;

    for line in raw.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            let header = trimmed.trim_start_matches('[').trim_end_matches(']');
            if let Some(rest) = header.strip_prefix("mcp_servers.") {
                if let Some(name) = rest.strip_suffix(".env") {
                    current = Some(name.to_string());
                    in_env = true;
                } else {
                    let name = rest.to_string();
                    in_env = false;
                    servers.entry(name.clone()).or_insert(McpServer {
                        id: format!("codex:global:{name}"),
                        name: name.clone(),
                        agent: "codex".to_string(),
                        scope: "global".to_string(),
                        project: None,
                        transport: "stdio".to_string(),
                        command: None,
                        args: Vec::new(),
                        url: None,
                        env_keys: Vec::new(),
                        source: "~/.codex/config.toml".to_string(),
                    });
                    current = Some(name);
                }
            } else {
                current = None;
                in_env = false;
            }
            continue;
        }

        let Some(name) = current.clone() else {
            continue;
        };
        let Some((key, value)) = trimmed.split_once('=') else {
            continue;
        };
        let key = key.trim();
        let value = value.trim();

        let Some(server) = servers.get_mut(&name) else {
            continue;
        };

        if in_env {
            server.env_keys.push(key.to_string());
            continue;
        }

        match key {
            "command" => server.command = Some(value.trim_matches('"').to_string()),
            "url" => {
                server.url = Some(value.trim_matches('"').to_string());
                server.transport = "http".to_string();
            }
            "args" => {
                server.args = value
                    .trim_start_matches('[')
                    .trim_end_matches(']')
                    .split(',')
                    .map(|part| part.trim().trim_matches('"').to_string())
                    .filter(|part| !part.is_empty())
                    .collect();
            }
            _ => {}
        }
    }

    servers.into_values().collect()
}

fn read(path: PathBuf) -> Option<String> {
    fs::read_to_string(path).ok()
}

pub const WORKBENCH_SERVER: &str = "workbench";

#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WorkbenchMcp {
    pub binary: String,
    pub command_line: String,
    pub config_snippet: String,
    pub installed_for: Vec<String>,
}

fn workbench_binary() -> Result<String, String> {
    std::env::current_exe()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

pub fn claude_entry(binary: &str) -> serde_json::Value {
    serde_json::json!({ "command": binary, "args": ["mcp"] })
}

pub fn codex_block(binary: &str) -> String {
    format!("\n[mcp_servers.{WORKBENCH_SERVER}]\ncommand = \"{binary}\"\nargs = [\"mcp\"]\n")
}

fn install_into_json(path: PathBuf, binary: &str) -> Result<(), String> {
    let mut root = read(path.clone())
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
        .unwrap_or_else(|| serde_json::json!({}));

    if !root.is_object() {
        return Err(format!("{} is not a JSON object", path.display()));
    }
    root["mcpServers"][WORKBENCH_SERVER] = claude_entry(binary);

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(
        &path,
        serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

fn install_into_codex(path: PathBuf, binary: &str) -> Result<(), String> {
    let existing = read(path.clone()).unwrap_or_default();
    if existing.contains(&format!("[mcp_servers.{WORKBENCH_SERVER}]")) {
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, format!("{}{}", existing, codex_block(binary))).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn workbench_mcp() -> Result<WorkbenchMcp, String> {
    let binary = workbench_binary()?;
    let installed_for = list_mcp_servers()
        .await?
        .into_iter()
        .filter(|server| server.name == WORKBENCH_SERVER)
        .map(|server| server.agent)
        .collect();

    Ok(WorkbenchMcp {
        command_line: format!("{binary} mcp"),
        config_snippet: serde_json::to_string_pretty(&serde_json::json!({
            "mcpServers": { WORKBENCH_SERVER: claude_entry(&binary) }
        }))
        .unwrap_or_default(),
        binary,
        installed_for,
    })
}

#[tauri::command]
pub async fn install_workbench_mcp(agent: String) -> Result<(), String> {
    let binary = workbench_binary()?;
    let home = dirs::home_dir().ok_or("could not resolve home directory")?;

    match agent.as_str() {
        "claude-code" => install_into_json(home.join(".claude.json"), &binary),
        "codex" => install_into_codex(home.join(".codex/config.toml"), &binary),
        "gemini-cli" => install_into_json(home.join(".gemini/settings.json"), &binary),
        "cursor-agent" => install_into_json(home.join(".cursor/mcp.json"), &binary),
        other => Err(format!("Workbench cannot configure {other} automatically.")),
    }
}

#[tauri::command]
pub async fn list_mcp_servers() -> Result<Vec<McpServer>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let home = dirs::home_dir().unwrap_or_default();
        let mut servers = Vec::new();

        if let Some(raw) = read(home.join(".claude.json")) {
            servers.extend(parse_claude_servers(&raw));
        }
        if let Some(raw) = read(home.join(".codex/config.toml")) {
            servers.extend(parse_codex_servers(&raw));
        }
        if let Some(raw) = read(home.join(".gemini/settings.json")) {
            let mut gemini = parse_claude_servers(&raw);
            for server in &mut gemini {
                server.agent = "gemini-cli".to_string();
                server.id = format!("gemini-cli:global:{}", server.name);
                server.source = "~/.gemini/settings.json".to_string();
            }
            servers.extend(gemini);
        }
        if let Some(raw) = read(home.join(".cursor/mcp.json")) {
            let mut cursor = parse_claude_servers(&raw);
            for server in &mut cursor {
                server.agent = "cursor-agent".to_string();
                server.id = format!("cursor-agent:global:{}", server.name);
                server.source = "~/.cursor/mcp.json".to_string();
            }
            servers.extend(cursor);
        }

        servers.sort_by(|a, b| {
            a.agent
                .cmp(&b.agent)
                .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });
        Ok(servers)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    const CLAUDE: &str = r#"{
      "mcpServers": {
        "imagegen": {
          "command": "npx",
          "args": ["-y", "imagegen-mcp-server"],
          "env": { "OPENAI_API_KEY": "sk-secret-value", "GOOGLE_API_KEY": "another-secret" }
        },
        "remote": { "url": "https://example.com/mcp", "type": "sse" }
      },
      "projects": {
        "/Users/me/code/app": { "mcpServers": { "sentry": { "command": "sentry-mcp" } } }
      }
    }"#;

    const CODEX: &str = r#"
[mcp_servers.node_repl]
command = "/usr/local/bin/node-repl"
args = ["--fast"]
startup_timeout_sec = 120

[mcp_servers.node_repl.env]
NODE_REPL_TOKEN = "super-secret"

[mcp_servers.computer-use]
command = "computer-use"
"#;

    #[test]
    fn installing_preserves_everything_else_in_the_config() {
        let mut root: serde_json::Value = serde_json::from_str(CLAUDE).unwrap();
        root["mcpServers"][WORKBENCH_SERVER] = claude_entry("/Applications/Workbench.app/wb");

        assert!(root["mcpServers"]["imagegen"].is_object());
        assert!(root["projects"]["/Users/me/code/app"].is_object());
        assert_eq!(root["mcpServers"]["workbench"]["args"][0], "mcp");

        let servers = parse_claude_servers(&root.to_string());
        let installed = servers.iter().find(|s| s.name == WORKBENCH_SERVER).unwrap();
        assert_eq!(
            installed.command.as_deref(),
            Some("/Applications/Workbench.app/wb")
        );
        assert_eq!(installed.args, vec!["mcp"]);
    }

    #[test]
    fn the_codex_block_round_trips_through_the_codex_parser() {
        let toml = format!("{}{}", CODEX, codex_block("/Applications/Workbench.app/wb"));
        let servers = parse_codex_servers(&toml);
        let installed = servers.iter().find(|s| s.name == WORKBENCH_SERVER).unwrap();
        assert_eq!(
            installed.command.as_deref(),
            Some("/Applications/Workbench.app/wb")
        );
        assert_eq!(installed.args, vec!["mcp"]);
        assert_eq!(servers.len(), 3);
    }

    #[test]
    fn never_exposes_environment_values() {
        let servers = parse_claude_servers(CLAUDE);
        let imagegen = servers.iter().find(|s| s.name == "imagegen").unwrap();
        assert_eq!(imagegen.env_keys, vec!["GOOGLE_API_KEY", "OPENAI_API_KEY"]);

        let serialised = serde_json::to_string(&servers).unwrap();
        assert!(!serialised.contains("sk-secret-value"));
        assert!(!serialised.contains("another-secret"));
    }

    #[test]
    fn reads_global_and_project_scoped_claude_servers() {
        let servers = parse_claude_servers(CLAUDE);
        assert_eq!(servers.len(), 3);

        let project = servers.iter().find(|s| s.name == "sentry").unwrap();
        assert_eq!(project.scope, "project");
        assert_eq!(project.project.as_deref(), Some("/Users/me/code/app"));

        let global = servers.iter().find(|s| s.name == "imagegen").unwrap();
        assert_eq!(global.scope, "global");
        assert!(global.project.is_none());
    }

    #[test]
    fn detects_transport_from_the_entry_shape() {
        let servers = parse_claude_servers(CLAUDE);
        assert_eq!(
            servers
                .iter()
                .find(|s| s.name == "imagegen")
                .unwrap()
                .transport,
            "stdio"
        );
        assert_eq!(
            servers
                .iter()
                .find(|s| s.name == "remote")
                .unwrap()
                .transport,
            "sse"
        );
    }

    #[test]
    fn parses_codex_toml_without_leaking_env_values() {
        let servers = parse_codex_servers(CODEX);
        assert_eq!(servers.len(), 2);

        let repl = servers.iter().find(|s| s.name == "node_repl").unwrap();
        assert_eq!(repl.command.as_deref(), Some("/usr/local/bin/node-repl"));
        assert_eq!(repl.args, vec!["--fast"]);
        assert_eq!(repl.env_keys, vec!["NODE_REPL_TOKEN"]);

        let serialised = serde_json::to_string(&servers).unwrap();
        assert!(!serialised.contains("super-secret"));
    }

    #[test]
    fn does_not_treat_an_env_table_as_its_own_server() {
        let servers = parse_codex_servers(CODEX);
        assert!(servers.iter().all(|s| !s.name.ends_with(".env")));
    }

    #[test]
    fn malformed_input_yields_nothing_rather_than_panicking() {
        assert!(parse_claude_servers("not json").is_empty());
        assert!(parse_claude_servers("{}").is_empty());
        assert!(parse_codex_servers("").is_empty());
        assert!(parse_codex_servers("[unrelated]\nkey = 1").is_empty());
    }
}
