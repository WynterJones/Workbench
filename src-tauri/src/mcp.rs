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
            id: format!("claude-code:{}:{name}", project.clone().unwrap_or_else(|| "global".into())),
            name: name.to_string(),
            agent: "claude-code".to_string(),
            scope: scope.to_string(),
            project,
            transport: transport_of(entry),
            command: entry.get("command").and_then(|c| c.as_str()).map(String::from),
            args: entry
                .get("args")
                .and_then(|a| a.as_array())
                .map(|a| a.iter().filter_map(|v| v.as_str().map(String::from)).collect())
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

        let Some(name) = current.clone() else { continue };
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
        assert_eq!(servers.iter().find(|s| s.name == "imagegen").unwrap().transport, "stdio");
        assert_eq!(servers.iter().find(|s| s.name == "remote").unwrap().transport, "sse");
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
