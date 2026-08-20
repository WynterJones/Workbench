use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;
use walkdir::WalkDir;

const ARTIFACT_DIRS: [&str; 8] = [
    "node_modules",
    "target",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "venv",
    ".venv",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReclaimEntry {
    pub path: String,
    pub kind: String,
    pub size_bytes: u64,
    pub project_path: String,
}

#[tauri::command]
pub fn pick_folder() -> Result<Option<String>, String> {
    let script = r#"POSIX path of (choose folder with prompt "Add a folder to scan")"#;
    let out = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Ok(None);
    }
    let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if path.is_empty() {
        Ok(None)
    } else {
        Ok(Some(path.trim_end_matches('/').to_string()))
    }
}

fn dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .max_depth(12)
        .into_iter()
        .filter_map(Result::ok)
        .filter_map(|e| e.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

fn nearest_project(path: &Path) -> String {
    path.parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}

#[tauri::command]
pub async fn disk_reclaim_scan() -> Result<Vec<ReclaimEntry>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let conn = crate::db::open()?;
        let roots: Vec<PathBuf> = crate::db::list_roots(&conn)
            .map_err(|e| e.to_string())?
            .into_iter()
            .filter(|r| r.enabled)
            .map(|r| PathBuf::from(r.path))
            .collect();

        let mut found = Vec::new();
        for root in roots {
            let mut walker = WalkDir::new(&root).max_depth(6).into_iter();
            while let Some(entry) = walker.next() {
                let Ok(entry) = entry else { continue };
                if !entry.file_type().is_dir() {
                    continue;
                }
                let name = entry.file_name().to_string_lossy().to_string();
                if name == ".git" {
                    walker.skip_current_dir();
                    continue;
                }
                if ARTIFACT_DIRS.contains(&name.as_str()) {
                    walker.skip_current_dir();
                    let path = entry.path();
                    found.push(ReclaimEntry {
                        size_bytes: dir_size(path),
                        project_path: nearest_project(path),
                        path: path.to_string_lossy().to_string(),
                        kind: name,
                    });
                }
            }
        }
        found.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
        Ok(found)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn dir_size_sums_nested_files() {
        let tmp = std::env::temp_dir().join("wb_misc_test");
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(tmp.join("a/b")).unwrap();
        fs::write(tmp.join("a/one.txt"), vec![0u8; 100]).unwrap();
        fs::write(tmp.join("a/b/two.txt"), vec![0u8; 50]).unwrap();
        assert_eq!(dir_size(&tmp), 150);
        let _ = fs::remove_dir_all(&tmp);
    }
}
