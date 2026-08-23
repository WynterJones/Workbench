use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::handoff::{cli_for, shell_escape};
use crate::models::AiProvider;
use crate::portfolio;
use crate::run::capture;
use crate::run::store::{self, ProjectRunInfo};

const MAX_SHOTS: usize = 8;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TourSession {
    pub command: String,
    pub prompt_path: String,
    pub handoff_path: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct TourReport {
    pub ok: bool,
    pub shots: i64,
    pub note: Option<String>,
}

fn handoff_dir() -> PathBuf {
    store::workbench_dir().join("handoff")
}

fn handoff_path(id: i64) -> PathBuf {
    handoff_dir().join(format!("{id}-tour.json"))
}

fn prompt_path(id: i64) -> PathBuf {
    store::workbench_dir()
        .join("prompts")
        .join(format!("{id}-tour.md"))
}

pub fn parse_report(raw: &str) -> Result<TourReport, String> {
    let trimmed = raw.trim().trim_start_matches("```json").trim_matches('`');
    let report: TourReport = serde_json::from_str(trimmed.trim())
        .map_err(|e| format!("the tour report is not valid JSON: {e}"))?;
    Ok(TourReport {
        note: report.note.filter(|s| !s.trim().is_empty()),
        ..report
    })
}

pub fn build_prompt(info: &ProjectRunInfo, chrome: Option<&str>) -> String {
    let mut prompt = format!(
        "Take a screenshot tour of this project so Workbench can show what it looks like.\n\n\
         Project: {}\nWorkbench project id: {}\nPath: {}\nFramework: {}\n",
        info.name, info.id, info.path, info.framework
    );

    prompt.push_str(&match &info.run_cmd {
        Some(cmd) => format!("Run command on file: {cmd}\n"),
        None => "Run command on file: none — work it out yourself.\n".into(),
    });
    if !info.deps_installed {
        prompt.push_str("Dependencies are not installed yet.\n");
    }

    prompt.push_str(&format!(
        "\nDo this:\n\
         1. Start the project and wait until it actually serves. Note the local URL.\n\
         2. Read the code to find the screens worth showing — the first thing a visitor sees, \
            the main working screen, and whatever else makes this project what it is. \
            At most {MAX_SHOTS} of them. Skip anything needing credentials you do not have.\n\
         3. Screenshot each one as a PNG at 1440x900:\n\
            {} --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=4000 \
            --window-size=1440,900 --screenshot=/tmp/wb-tour-<label>.png \"<url>\"\n\
            If a screen needs a click, a login or an open menu first, drive it with Playwright \
            or Puppeteer instead and save the PNG the same way.\n\
         4. Hand every finished PNG to Workbench with the workbench MCP tool add_screenshot, \
            one call each: {{\"id\": {}, \"file\": \"/tmp/wb-tour-dashboard.png\", \"label\": \"Dashboard\"}}. \
            The label is what the person will read under the shot, so name the area, not the file. \
            If the workbench MCP server is not connected, copy the PNG into {} instead, \
            named after the label.\n\
         5. Check the shot is not blank or an error page before you hand it over. Retake it if it is.\n\
         6. Stop the server you started.\n\
         7. Write your result to {} as JSON, nothing else in the file:\n\
            {{\"ok\": true, \"shots\": 5, \"note\": \"what you captured\"}}\n\
            If you could not do it, write {{\"ok\": false, \"shots\": 0, \"note\": \"why, in plain language\"}}.\n\
            Write that file as the last thing you do.\n",
        chrome.unwrap_or("<your headless browser>"),
        info.id,
        portfolio::images_dir(info.id).to_string_lossy(),
        handoff_path(info.id).to_string_lossy(),
    ));

    prompt
}

#[tauri::command]
pub fn start_screenshot_tour(id: i64, provider: AiProvider) -> Result<TourSession, String> {
    let info = store::get_project_run_info(id)?;
    let _ = crate::mcp::install_workbench_mcp_for(provider.as_str());

    let prompt = build_prompt(&info, capture::resolve_chrome_binary().as_deref());
    let prompt_file = prompt_path(id);
    if let Some(parent) = prompt_file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&prompt_file, &prompt).map_err(|e| e.to_string())?;

    let handoff = handoff_path(id);
    std::fs::create_dir_all(handoff_dir()).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&handoff);

    Ok(TourSession {
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
pub fn poll_screenshot_tour(id: i64) -> Result<Option<TourReport>, String> {
    let path = handoff_path(id);
    let Ok(raw) = std::fs::read_to_string(&path) else {
        return Ok(None);
    };
    let report = parse_report(&raw)?;
    let _ = std::fs::remove_file(&path);
    Ok(Some(report))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn info() -> ProjectRunInfo {
        ProjectRunInfo {
            id: 7,
            path: "/tmp/olgarcade".into(),
            name: "OLGArcade".into(),
            run_cmd: Some("npm run dev".into()),
            trusted: true,
            deps_installed: false,
            has_env_example: false,
            port: None,
            framework: "vite".into(),
            readme_summary: None,
            status: "runnable".into(),
            git_remote: None,
            run_url: None,
        }
    }

    #[test]
    fn prompt_names_the_project_id_the_tool_and_the_report_file() {
        let prompt = build_prompt(&info(), Some("/Applications/Chrome"));
        assert!(prompt.contains("Workbench project id: 7"));
        assert!(prompt.contains("add_screenshot"));
        assert!(prompt.contains("\"id\": 7"));
        assert!(prompt.contains("/portfolio/7/images"));
        assert!(prompt.contains("/handoff/7-tour.json"), "got: {prompt}");
        assert!(prompt.contains("/Applications/Chrome"));
        assert!(prompt.contains("npm run dev"));
        assert!(prompt.contains("Dependencies are not installed"));
    }

    #[test]
    fn prompt_still_works_without_chrome_installed() {
        let prompt = build_prompt(&info(), None);
        assert!(prompt.contains("<your headless browser>"));
    }

    #[test]
    fn report_parses_a_fenced_success_and_drops_blank_notes() {
        let report = parse_report("```json\n{\"ok\": true, \"shots\": 5, \"note\": \" \"}\n```").unwrap();
        assert!(report.ok);
        assert_eq!(report.shots, 5);
        assert!(report.note.is_none());
    }

    #[test]
    fn missing_fields_default_instead_of_failing() {
        assert_eq!(parse_report("{}").unwrap(), TourReport::default());
        assert!(parse_report("not json").is_err());
    }
}
