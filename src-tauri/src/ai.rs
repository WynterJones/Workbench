use crate::models::{AiProvider, AiSession};
use crate::run::store;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;

fn slugify(name: &str) -> String {
    let mut slug = String::new();
    let mut last_was_dash = false;
    for ch in name.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            last_was_dash = false;
        } else if !last_was_dash && !slug.is_empty() {
            slug.push('-');
            last_was_dash = true;
        }
    }
    while slug.ends_with('-') {
        slug.pop();
    }
    if slug.is_empty() {
        slug.push_str("project");
    }
    slug.chars().take(40).collect()
}

fn session_name(project_name: &str) -> String {
    format!("wb-{}", slugify(project_name))
}

fn shell_escape(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn cli_for_provider(provider: AiProvider) -> &'static str {
    match provider {
        AiProvider::ClaudeCode => "claude",
        AiProvider::Codex => "codex",
    }
}

fn which_exists(name: &str) -> bool {
    Command::new("which")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn tmux_available() -> bool {
    which_exists("tmux")
}

fn has_session(name: &str) -> bool {
    Command::new("tmux")
        .args(["has-session", "-t", name])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SessionRecord {
    tmux_session: String,
    provider: AiProvider,
}

fn sessions_file() -> PathBuf {
    store::workbench_dir().join("sessions.json")
}

fn load_sessions() -> HashMap<i64, SessionRecord> {
    std::fs::read_to_string(sessions_file())
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_sessions(sessions: &HashMap<i64, SessionRecord>) -> Result<(), String> {
    let dir = store::workbench_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(sessions).map_err(|e| e.to_string())?;
    std::fs::write(sessions_file(), json).map_err(|e| e.to_string())
}

fn find_todos(project_path: &str) -> Vec<String> {
    let re = Regex::new(r"(TODO|FIXME|HACK)").unwrap();
    let mut found = Vec::new();
    let walker = ignore::WalkBuilder::new(project_path)
        .max_depth(Some(8))
        .hidden(false)
        .build();
    for entry in walker {
        if found.len() >= 20 {
            break;
        }
        let Ok(entry) = entry else { continue };
        if !entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            continue;
        }
        let path = entry.path();
        if is_probably_binary(path) {
            continue;
        }
        let Ok(contents) = std::fs::read_to_string(path) else {
            continue;
        };
        for (idx, line) in contents.lines().enumerate() {
            if found.len() >= 20 {
                break;
            }
            if re.is_match(line) {
                found.push(format!("{}:{}: {}", path.display(), idx + 1, line.trim()));
            }
        }
    }
    found
}

fn is_probably_binary(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|e| e.to_str()),
        Some(
            "png"
                | "jpg"
                | "jpeg"
                | "gif"
                | "ico"
                | "woff"
                | "woff2"
                | "ttf"
                | "db"
                | "sqlite"
                | "lock"
        )
    )
}

fn recent_git_log(project_path: &str) -> Vec<String> {
    let Ok(repo) = git2::Repository::open(project_path) else {
        return Vec::new();
    };
    let Ok(mut walk) = repo.revwalk() else {
        return Vec::new();
    };
    if walk.push_head().is_err() {
        return Vec::new();
    }
    walk.take(10)
        .filter_map(|oid| {
            let oid = oid.ok()?;
            let commit = repo.find_commit(oid).ok()?;
            let summary = commit.summary().unwrap_or("").to_string();
            let short = oid.to_string().chars().take(7).collect::<String>();
            Some(format!("{short} {summary}"))
        })
        .collect()
}

fn compose_prompt(id: i64) -> Result<String, String> {
    let info = store::get_project_run_info(id)?;
    let todos = find_todos(&info.path);
    let commits = recent_git_log(&info.path);
    let screenshot = store::get_screenshot_path(id, "desktop");

    let mut prompt = String::new();
    prompt.push_str(&format!("# Project: {}\n\n", info.name));
    prompt.push_str(&format!("Framework: {}\n", info.framework));
    prompt.push_str(&format!("Path: {}\n", info.path));
    prompt.push_str(&format!("Detected status: {}\n", info.status));
    if let Some(url) = &info.run_url {
        prompt.push_str(&format!("Last known run URL: {url}\n"));
    }
    if let Some(shot) = &screenshot {
        prompt.push_str(&format!("Latest screenshot: {shot}\n"));
    }
    prompt.push('\n');

    if let Some(readme) = &info.readme_summary {
        prompt.push_str("## README summary\n");
        prompt.push_str(readme);
        prompt.push_str("\n\n");
    }

    prompt.push_str("## Recent git history\n");
    if commits.is_empty() {
        prompt.push_str("(no git history found)\n");
    } else {
        for line in &commits {
            prompt.push_str(&format!("- {line}\n"));
        }
    }
    prompt.push('\n');

    prompt.push_str("## Detected TODOs\n");
    if todos.is_empty() {
        prompt.push_str("(none found)\n");
    } else {
        for todo in &todos {
            prompt.push_str(&format!("- {todo}\n"));
        }
    }
    prompt.push('\n');

    prompt.push_str(
        "## Instructions\n\
        First determine this app's current state by reading the code, the README, \
        and the screenshot if present. Then recommend the single highest-leverage \
        next task to move this project forward, and explain why in one or two \
        sentences before starting work.\n",
    );

    Ok(prompt)
}

fn prompt_file_path(id: i64) -> PathBuf {
    store::workbench_dir()
        .join("prompts")
        .join(format!("{id}.md"))
}

fn write_prompt_file(id: i64, prompt: &str) -> Result<PathBuf, String> {
    let path = prompt_file_path(id);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, prompt).map_err(|e| e.to_string())?;
    Ok(path)
}

#[tauri::command]
pub fn build_ai_prompt(id: i64) -> Result<String, String> {
    compose_prompt(id)
}

#[tauri::command]
pub fn start_ai_session(id: i64, provider: AiProvider) -> Result<AiSession, String> {
    if !tmux_available() {
        return Err("tmux is not installed; install it with `brew install tmux`".to_string());
    }
    let info = store::get_project_run_info(id)?;
    let name = session_name(&info.name);

    let mut sessions = load_sessions();

    if has_session(&name) {
        sessions.insert(
            id,
            SessionRecord {
                tmux_session: name.clone(),
                provider,
            },
        );
        save_sessions(&sessions)?;
        return Ok(AiSession {
            project_id: id,
            provider,
            tmux_session: name.clone(),
            attach_command: format!("tmux attach -t {name}"),
        });
    }

    let prompt = compose_prompt(id)?;
    let prompt_path = write_prompt_file(id, &prompt)?;

    let create = Command::new("tmux")
        .args(["new-session", "-d", "-s", &name, "-c", &info.path])
        .output()
        .map_err(|e| e.to_string())?;
    if !create.status.success() {
        return Err(String::from_utf8_lossy(&create.stderr).to_string());
    }

    let cli = cli_for_provider(provider);
    let invocation = format!(
        "{cli} \"$(cat {})\"",
        shell_escape(&prompt_path.to_string_lossy())
    );
    let send = Command::new("tmux")
        .args(["send-keys", "-t", &name, &invocation, "Enter"])
        .output()
        .map_err(|e| e.to_string())?;
    if !send.status.success() {
        return Err(String::from_utf8_lossy(&send.stderr).to_string());
    }

    sessions.insert(
        id,
        SessionRecord {
            tmux_session: name.clone(),
            provider,
        },
    );
    save_sessions(&sessions)?;

    Ok(AiSession {
        project_id: id,
        provider,
        tmux_session: name.clone(),
        attach_command: format!("tmux attach -t {name}"),
    })
}

#[tauri::command]
pub fn list_ai_sessions() -> Result<Vec<AiSession>, String> {
    let mut sessions = load_sessions();
    sessions.retain(|_, record| has_session(&record.tmux_session));
    save_sessions(&sessions)?;
    Ok(sessions
        .into_iter()
        .map(|(project_id, record)| AiSession {
            project_id,
            provider: record.provider,
            tmux_session: record.tmux_session.clone(),
            attach_command: format!("tmux attach -t {}", record.tmux_session),
        })
        .collect())
}

#[tauri::command]
pub fn kill_ai_session(id: i64) -> Result<(), String> {
    let mut sessions = load_sessions();
    if let Some(record) = sessions.remove(&id) {
        let _ = Command::new("tmux")
            .args(["kill-session", "-t", &record.tmux_session])
            .output();
    }
    save_sessions(&sessions)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCliAvailability {
    pub claude_code: bool,
    pub codex: bool,
}

#[tauri::command]
pub fn detect_ai_clis() -> AiCliAvailability {
    AiCliAvailability {
        claude_code: which_exists("claude"),
        codex: which_exists("codex"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugifies_simple_names() {
        assert_eq!(slugify("My Cool App"), "my-cool-app");
    }

    #[test]
    fn slugifies_special_characters() {
        assert_eq!(slugify("weird_App!! v2.0"), "weird-app-v2-0");
    }

    #[test]
    fn slugify_never_empty() {
        assert_eq!(slugify("!!!"), "project");
    }

    #[test]
    fn session_name_has_wb_prefix() {
        assert_eq!(session_name("Portfolio Site"), "wb-portfolio-site");
    }

    #[test]
    fn shell_escape_handles_quotes_and_spaces() {
        let escaped = shell_escape("/Users/me/My Projects/it's here.md");
        assert_eq!(escaped, "'/Users/me/My Projects/it'\\''s here.md'");
    }
}
