use std::process::Command;

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemCheck {
    pub id: String,
    pub label: String,
    pub ok: bool,
    pub required: bool,
    pub detail: String,
    pub enables: String,
    pub fix_command: String,
    pub fix_url: String,
}

const CHROME_PATHS: [&str; 3] = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

fn which(binary: &str) -> Option<String> {
    let output = Command::new("/bin/sh")
        .arg("-lc")
        .arg(format!("command -v {binary}"))
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    (!path.is_empty()).then_some(path)
}

fn chrome_path() -> Option<String> {
    CHROME_PATHS
        .iter()
        .find(|p| std::path::Path::new(p).exists())
        .map(|p| p.to_string())
        .or_else(|| which("google-chrome-stable"))
}

pub fn build_checks(
    git: Option<String>,
    chrome: Option<String>,
    tmux: Option<String>,
    node: Option<String>,
) -> Vec<SystemCheck> {
    vec![
        SystemCheck {
            id: "git".into(),
            label: "Git".into(),
            ok: git.is_some(),
            required: false,
            detail: git.unwrap_or_else(|| "Not found on your PATH".into()),
            enables: "Branch, commit history and the contribution heatmap".into(),
            fix_command: "xcode-select --install".into(),
            fix_url: "https://git-scm.com/downloads".into(),
        },
        SystemCheck {
            id: "chrome".into(),
            label: "Chrome".into(),
            ok: chrome.is_some(),
            required: false,
            detail: chrome.unwrap_or_else(|| "No Chrome, Chromium or Edge found".into()),
            enables: "Automatic screenshots of projects you run".into(),
            fix_command: "brew install --cask google-chrome".into(),
            fix_url: "https://www.google.com/chrome/".into(),
        },
        SystemCheck {
            id: "tmux".into(),
            label: "tmux".into(),
            ok: tmux.is_some(),
            required: false,
            detail: tmux.unwrap_or_else(|| "Not found on your PATH".into()),
            enables: "Background AI sessions that survive quitting Workbench".into(),
            fix_command: "brew install tmux".into(),
            fix_url: "https://github.com/tmux/tmux/wiki".into(),
        },
        SystemCheck {
            id: "node".into(),
            label: "Node".into(),
            ok: node.is_some(),
            required: false,
            detail: node.unwrap_or_else(|| "Not found on your PATH".into()),
            enables: "Running JavaScript projects and installing skills".into(),
            fix_command: "brew install node".into(),
            fix_url: "https://nodejs.org/".into(),
        },
    ]
}

#[tauri::command]
pub async fn system_checks() -> Result<Vec<SystemCheck>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        Ok(build_checks(
            which("git"),
            chrome_path(),
            which("tmux"),
            which("node"),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_ok_only_when_a_path_was_found() {
        let checks = build_checks(Some("/usr/bin/git".into()), None, None, None);
        let git = checks.iter().find(|c| c.id == "git").unwrap();
        let chrome = checks.iter().find(|c| c.id == "chrome").unwrap();
        assert!(git.ok);
        assert_eq!(git.detail, "/usr/bin/git");
        assert!(!chrome.ok);
        assert!(!chrome.detail.is_empty());
    }

    #[test]
    fn every_check_explains_what_it_enables_and_how_to_fix_it() {
        for check in build_checks(None, None, None, None) {
            assert!(!check.label.is_empty(), "{} has no label", check.id);
            assert!(!check.enables.is_empty(), "{} has no enables text", check.id);
            assert!(!check.fix_command.is_empty(), "{} has no fix", check.id);
            assert!(check.fix_url.starts_with("https://"), "{} bad url", check.id);
        }
    }

    #[test]
    fn nothing_is_required_so_the_intro_can_always_be_completed() {
        assert!(build_checks(None, None, None, None).iter().all(|c| !c.required));
    }

    #[test]
    fn resolves_binaries_through_a_login_shell() {
        assert!(which("sh").is_some());
        assert!(which("definitely-not-real-xyz").is_none());
    }
}
