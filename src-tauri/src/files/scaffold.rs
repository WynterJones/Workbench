use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::files::fs_ops::guard_existing;
use crate::files::starters::list_starters;

const OUTPUT_TAIL_LINES: usize = 100;
const INVALID_NAME_ERR: &str =
    "project name may only contain letters, numbers, dots, hyphens, and underscores";

pub fn validate_project_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err(INVALID_NAME_ERR.to_string());
    }
    let valid = name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-');
    if valid {
        Ok(())
    } else {
        Err(INVALID_NAME_ERR.to_string())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScaffoldResult {
    pub created_path: String,
    pub exit_code: Option<i32>,
    pub success: bool,
    pub output_tail: String,
}

pub fn scaffold_starter(
    app: AppHandle,
    starter_id: &str,
    parent_dir: &str,
    project_name: &str,
    confirmed: bool,
    roots: &[PathBuf],
) -> Result<ScaffoldResult, String> {
    if !confirmed {
        return Err("scaffold command was not confirmed by the caller".to_string());
    }
    validate_project_name(project_name)?;

    let resolved_parent = guard_existing(parent_dir, roots)?;
    if !resolved_parent.is_dir() {
        return Err(format!("{parent_dir} is not a directory"));
    }

    let starter = list_starters()?
        .into_iter()
        .find(|t| t.id == starter_id)
        .ok_or_else(|| format!("unknown starter {starter_id}"))?;

    let command = starter.command.replace("{{name}}", project_name);

    let mut child = Command::new("/bin/sh")
        .arg("-lc")
        .arg(&command)
        .current_dir(&resolved_parent)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().ok_or_else(|| "no stdout pipe".to_string())?;
    let stderr = child.stderr.take().ok_or_else(|| "no stderr pipe".to_string())?;

    let (tx, rx) = std::sync::mpsc::channel::<String>();
    let tx_stdout = tx.clone();
    let stdout_handle = std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().flatten() {
            let _ = tx_stdout.send(line);
        }
    });
    let stderr_handle = std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().flatten() {
            let _ = tx.send(line);
        }
    });

    let mut tail: VecDeque<String> = VecDeque::with_capacity(OUTPUT_TAIL_LINES);
    while let Ok(line) = rx.recv() {
        let _ = app.emit("scaffold:progress", &line);
        if tail.len() == OUTPUT_TAIL_LINES {
            tail.pop_front();
        }
        tail.push_back(line);
    }

    let _ = stdout_handle.join();
    let _ = stderr_handle.join();
    let status = child.wait().map_err(|e| e.to_string())?;

    let created_path = resolved_parent.join(project_name);
    Ok(ScaffoldResult {
        created_path: created_path.to_string_lossy().to_string(),
        exit_code: status.code(),
        success: status.success(),
        output_tail: tail.into_iter().collect::<Vec<_>>().join("\n"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_normal_project_names() {
        assert!(validate_project_name("my-app").is_ok());
        assert!(validate_project_name("my_app_2").is_ok());
        assert!(validate_project_name("v1.0.0").is_ok());
    }

    #[test]
    fn rejects_empty_name() {
        assert!(validate_project_name("").is_err());
    }

    #[test]
    fn rejects_command_injection_attempts() {
        assert!(validate_project_name("; rm -rf /").is_err());
        assert!(validate_project_name("app && rm -rf /").is_err());
        assert!(validate_project_name("app`whoami`").is_err());
        assert!(validate_project_name("app$(whoami)").is_err());
        assert!(validate_project_name("has space").is_err());
        assert!(validate_project_name("../escape").is_err());
        assert!(validate_project_name("app|cat /etc/passwd").is_err());
    }
}
