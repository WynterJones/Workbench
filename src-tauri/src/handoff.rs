use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;
use crate::models::{AiProvider, BrokenReason, ProjectPatch, ProjectStatus};
use crate::run::store::{self, ProjectRunInfo};
use crate::scan::meta;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct HandoffReport {
    pub ok: bool,
    pub run_command: Option<String>,
    pub url: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunFixSession {
    pub command: String,
    pub prompt_path: String,
    pub handoff_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HandoffOutcome {
    pub report: HandoffReport,
    pub captured: bool,
}

fn handoff_dir() -> PathBuf {
    store::workbench_dir().join("handoff")
}

pub fn handoff_path(id: i64) -> PathBuf {
    handoff_dir().join(format!("{id}.json"))
}

fn prompt_path(id: i64) -> PathBuf {
    store::workbench_dir()
        .join("prompts")
        .join(format!("{id}-run.md"))
}

pub fn parse_report(raw: &str) -> Result<HandoffReport, String> {
    let trimmed = raw.trim().trim_start_matches("```json").trim_matches('`');
    let report: HandoffReport = serde_json::from_str(trimmed.trim())
        .map_err(|e| format!("handoff file is not valid JSON: {e}"))?;
    Ok(HandoffReport {
        ok: report.ok,
        run_command: report.run_command.filter(|s| !s.trim().is_empty()),
        url: report.url.filter(|s| !s.trim().is_empty()),
        note: report.note.filter(|s| !s.trim().is_empty()),
    })
}

pub fn build_prompt(info: &ProjectRunInfo, reason: Option<BrokenReason>, log_tail: &str) -> String {
    let mut prompt = format!(
        "Workbench could not start this project. Get it running, then report back.\n\n\
         Project: {}\nPath: {}\nFramework: {}\n",
        info.name, info.path, info.framework
    );

    prompt.push_str(&match &info.run_cmd {
        Some(cmd) => format!("Run command on file: {cmd}\n"),
        None => "Run command on file: none — Workbench could not infer one.\n".into(),
    });

    if let Some(reason) = reason {
        prompt.push_str(&format!("Workbench reported: {}\n", reason.as_str()));
    }
    if !info.deps_installed {
        prompt.push_str("Dependencies are not installed.\n");
    }
    if info.has_env_example {
        prompt.push_str("There is a .env.example — the project may need real env values.\n");
    }
    if !log_tail.trim().is_empty() {
        prompt.push_str(&format!("\nLast run output:\n{}\n", log_tail.trim()));
    }

    prompt.push_str(&format!(
        "\nDo this:\n\
         1. Work out how this project is meant to run. Install dependencies if that is what is missing.\n\
         2. Start it and confirm it actually serves — note the exact command and the local URL.\n\
         3. Stop the server again so Workbench can start it itself.\n\
         4. Write your result to {} as JSON, nothing else in the file:\n\
         {{\"ok\": true, \"runCommand\": \"npm run dev\", \"url\": \"http://localhost:5173\", \"note\": \"what you had to do\"}}\n\n\
         If it cannot be run on this machine, write {{\"ok\": false, \"note\": \"...\"}} instead, where the note \
         explains in plain language why, and what the person would need to do to run it.\n\
         Write that file as the last thing you do.\n",
        handoff_path(info.id).to_string_lossy()
    ));

    prompt
}

fn shell_escape(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn cli_for(provider: AiProvider) -> &'static str {
    match provider {
        AiProvider::ClaudeCode => "claude",
        AiProvider::Codex => "codex",
    }
}

#[tauri::command]
pub fn start_run_fix(
    id: i64,
    provider: AiProvider,
    reason: Option<String>,
    log_tail: Option<String>,
) -> Result<RunFixSession, String> {
    let info = store::get_project_run_info(id)?;
    let reason = reason.as_deref().and_then(BrokenReason::from_str);
    let prompt = build_prompt(&info, reason, log_tail.as_deref().unwrap_or_default());

    let prompt_file = prompt_path(id);
    if let Some(parent) = prompt_file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&prompt_file, &prompt).map_err(|e| e.to_string())?;

    let handoff = handoff_path(id);
    std::fs::create_dir_all(handoff_dir()).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&handoff);

    Ok(RunFixSession {
        command: format!(
            "{} \"$(cat {})\"",
            cli_for(provider),
            shell_escape(&prompt_file.to_string_lossy())
        ),
        prompt_path: prompt_file.to_string_lossy().to_string(),
        handoff_path: handoff.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn poll_handoff(app: AppHandle, id: i64) -> Result<Option<HandoffOutcome>, String> {
    let path = handoff_path(id);
    let Ok(raw) = std::fs::read_to_string(&path) else {
        return Ok(None);
    };
    let report = parse_report(&raw)?;
    let _ = std::fs::remove_file(&path);

    let info = store::get_project_run_info(id)?;
    let conn = store::open_conn()?;
    let mut patch = ProjectPatch::default();

    if report.ok {
        if let Some(cmd) = &report.run_command {
            patch.run_cmd = Some(Some(cmd.clone()));
        }
        patch.deps_installed = Some(meta::deps_installed(std::path::Path::new(&info.path)));
        patch.status = Some(ProjectStatus::Runnable);
        patch.broken_reason = Some(None);
    }
    db::update_project(&conn, id, &patch).map_err(|e| e.to_string())?;
    drop(conn);

    let captured = report.ok
        && report.run_command.is_some()
        && info.trusted
        && crate::run::capture_project(app, id).is_ok();

    Ok(Some(HandoffOutcome { report, captured }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn info() -> ProjectRunInfo {
        ProjectRunInfo {
            id: 7,
            path: "/tmp/olgarcade".into(),
            name: "OLGArcade".into(),
            run_cmd: None,
            trusted: true,
            deps_installed: false,
            has_env_example: true,
            port: None,
            framework: "chrome-extension".into(),
            readme_summary: None,
            status: "broken".into(),
            git_remote: None,
            run_url: None,
        }
    }

    #[test]
    fn prompt_names_the_exact_handoff_file_and_contract() {
        let prompt = build_prompt(&info(), Some(BrokenReason::NoRunCommand), "");
        assert!(prompt.contains("/handoff/7.json"), "got: {prompt}");
        assert!(prompt.contains("\"runCommand\""));
        assert!(prompt.contains("no-run-command"));
        assert!(prompt.contains("Dependencies are not installed."));
    }

    #[test]
    fn prompt_carries_the_failing_output_when_there_is_some() {
        let prompt = build_prompt(
            &info(),
            Some(BrokenReason::Crashed),
            "  Error: EADDRINUSE  ",
        );
        assert!(prompt.contains("Error: EADDRINUSE"));
        assert!(!build_prompt(&info(), None, "   ").contains("Last run output"));
    }

    #[test]
    fn report_parses_a_success() {
        let report = parse_report(
            r#"{"ok": true, "runCommand": "npm run dev", "url": "http://localhost:5173"}"#,
        )
        .unwrap();
        assert!(report.ok);
        assert_eq!(report.run_command.as_deref(), Some("npm run dev"));
        assert_eq!(report.url.as_deref(), Some("http://localhost:5173"));
        assert!(report.note.is_none());
    }

    #[test]
    fn report_survives_a_fenced_block_and_blank_fields() {
        let report = parse_report(
            "```json\n{\"ok\": false, \"note\": \"needs a Postgres\", \"url\": \"\"}\n```",
        )
        .unwrap();
        assert!(!report.ok);
        assert_eq!(report.note.as_deref(), Some("needs a Postgres"));
        assert!(report.url.is_none());
    }

    #[test]
    fn missing_fields_default_instead_of_failing() {
        let report = parse_report(r#"{"ok": true}"#).unwrap();
        assert!(report.ok);
        assert!(report.run_command.is_none());
        assert!(parse_report("not json at all").is_err());
    }
}
