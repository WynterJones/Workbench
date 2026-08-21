use crate::models::{Editor, Terminal};
use crate::run::store;
use std::process::Command;

fn which_exists(name: &str) -> bool {
    Command::new("which")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn run_app(app_name: &str, path: &str) -> Result<(), String> {
    let status = Command::new("open")
        .args(["-a", app_name, path])
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("failed to open {app_name}"))
    }
}

fn open_finder(path: &str) -> Result<(), String> {
    let status = Command::new("open")
        .args(["-R", path])
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("failed to reveal in Finder".to_string())
    }
}

fn terminal_app_name(terminal: Terminal) -> &'static str {
    match terminal {
        Terminal::Terminal => "Terminal",
        Terminal::Iterm => "iTerm",
        Terminal::Warp => "Warp",
        Terminal::Ghostty => "Ghostty",
    }
}

fn open_terminal(path: &str) -> Result<(), String> {
    let settings = store::get_settings();
    run_app(terminal_app_name(settings.terminal), path)
}

fn editor_cli_and_app(editor: Editor) -> (&'static str, &'static str) {
    match editor {
        Editor::Vscode => ("code", "Visual Studio Code"),
        Editor::Cursor => ("cursor", "Cursor"),
        Editor::Zed => ("zed", "Zed"),
        Editor::Webstorm => ("webstorm", "WebStorm"),
    }
}

fn open_editor(path: &str) -> Result<(), String> {
    let settings = store::get_settings();
    let (cli, app_name) = editor_cli_and_app(settings.editor);
    if which_exists(cli) {
        let status = Command::new(cli)
            .arg(path)
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
    }
    run_app(app_name, path)
}

fn open_browser(url: &str) -> Result<(), String> {
    let status = Command::new("open")
        .arg(url)
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("failed to open browser".to_string())
    }
}

fn normalize_github_url(remote: &str) -> Option<String> {
    let trimmed = remote.trim();
    let without_suffix = trimmed.strip_suffix(".git").unwrap_or(trimmed);

    if let Some(rest) = without_suffix.strip_prefix("git@github.com:") {
        return Some(format!("https://github.com/{rest}"));
    }
    if let Some(rest) = without_suffix.strip_prefix("ssh://git@github.com/") {
        return Some(format!("https://github.com/{rest}"));
    }
    if without_suffix.starts_with("https://github.com/")
        || without_suffix.starts_with("http://github.com/")
    {
        return Some(without_suffix.to_string());
    }
    None
}

fn open_github(remote: Option<&str>) -> Result<(), String> {
    let remote = remote.ok_or("project has no git remote")?;
    let url = normalize_github_url(remote).ok_or("git remote is not a github url")?;
    open_browser(&url)
}

#[tauri::command]
pub fn open_in(target: String, id: i64) -> Result<(), String> {
    let info = store::get_project_run_info(id)?;
    match target.as_str() {
        "finder" => open_finder(&info.path),
        "terminal" => open_terminal(&info.path),
        "editor" => open_editor(&info.path),
        "browser" => {
            let url = info.run_url.ok_or("project has no known run url")?;
            open_browser(&url)
        }
        "github" => open_github(info.git_remote.as_deref()),
        other => Err(format!("unknown open target: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_ssh_shorthand_remote() {
        assert_eq!(
            normalize_github_url("git@github.com:wynterjones/workbench.git"),
            Some("https://github.com/wynterjones/workbench".to_string())
        );
    }

    #[test]
    fn normalizes_ssh_protocol_remote() {
        assert_eq!(
            normalize_github_url("ssh://git@github.com/wynterjones/workbench.git"),
            Some("https://github.com/wynterjones/workbench".to_string())
        );
    }

    #[test]
    fn normalizes_https_remote_with_git_suffix() {
        assert_eq!(
            normalize_github_url("https://github.com/wynterjones/workbench.git"),
            Some("https://github.com/wynterjones/workbench".to_string())
        );
    }

    #[test]
    fn passes_through_https_remote_without_suffix() {
        assert_eq!(
            normalize_github_url("https://github.com/wynterjones/workbench"),
            Some("https://github.com/wynterjones/workbench".to_string())
        );
    }

    #[test]
    fn rejects_non_github_remote() {
        assert_eq!(normalize_github_url("git@gitlab.com:foo/bar.git"), None);
    }
}
