use std::path::PathBuf;

use serde::Serialize;
use walkdir::WalkDir;

use crate::db;

const SKIP_DIRS: [&str; 12] = [
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "venv",
    ".venv",
    "__pycache__",
    "Pods",
    "Library",
];
const MAX_RESULTS: usize = 60;
const MAX_DEPTH: usize = 5;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderMatch {
    pub name: String,
    pub path: String,
    pub parent: String,
    pub is_scan_root: bool,
}

fn score(name: &str, query: &str) -> Option<i32> {
    if query.is_empty() {
        return Some(0);
    }
    let lower = name.to_lowercase();
    let needle = query.to_lowercase();
    if lower == needle {
        Some(100)
    } else if lower.starts_with(&needle) {
        Some(80 - lower.len() as i32)
    } else if lower.contains(&needle) {
        Some(50 - lower.len() as i32)
    } else {
        None
    }
}

pub fn search(roots: &[PathBuf], query: &str) -> Vec<FolderMatch> {
    let mut matches: Vec<(i32, FolderMatch)> = Vec::new();

    for root in roots {
        let mut walker = WalkDir::new(root).max_depth(MAX_DEPTH).into_iter();
        while let Some(entry) = walker.next() {
            let Ok(entry) = entry else { continue };
            if !entry.file_type().is_dir() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if SKIP_DIRS.contains(&name.as_str()) || name.starts_with('.') {
                if entry.depth() > 0 {
                    walker.skip_current_dir();
                }
                continue;
            }
            if let Some(rank) = score(&name, query) {
                let path = entry.path();
                matches.push((
                    rank,
                    FolderMatch {
                        name,
                        parent: path
                            .parent()
                            .map(|p| p.to_string_lossy().to_string())
                            .unwrap_or_default(),
                        is_scan_root: roots.iter().any(|r| r == path),
                        path: path.to_string_lossy().to_string(),
                    },
                ));
            }
        }
    }

    matches.sort_by(|a, b| {
        b.0.cmp(&a.0)
            .then_with(|| a.1.path.len().cmp(&b.1.path.len()))
    });
    matches.truncate(MAX_RESULTS);
    matches.into_iter().map(|(_, m)| m).collect()
}

#[tauri::command]
pub async fn search_folders(query: String) -> Result<Vec<FolderMatch>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db::open()?;
        let mut roots: Vec<PathBuf> = db::list_roots(&conn)
            .map_err(|e| e.to_string())?
            .into_iter()
            .filter(|r| r.enabled)
            .map(|r| PathBuf::from(r.path))
            .collect();

        if roots.is_empty() {
            if let Some(home) = dirs::home_dir() {
                roots.push(home);
            }
        }

        Ok(search(&roots, &query))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn ranks_exact_then_prefix_then_contains() {
        assert_eq!(score("app", "app"), Some(100));
        assert!(score("apps-web", "app").unwrap() < 100);
        assert!(score("my-app", "app").unwrap() < score("apps", "app").unwrap());
        assert_eq!(score("unrelated", "app"), None);
    }

    #[test]
    fn skips_noise_directories() {
        let root = std::env::temp_dir().join("wb_folder_search");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("node_modules/target-app")).unwrap();
        fs::create_dir_all(root.join("real-app")).unwrap();

        let found = search(&[root.clone()], "app");
        assert!(found.iter().any(|f| f.name == "real-app"));
        assert!(!found.iter().any(|f| f.path.contains("node_modules")));
        let _ = fs::remove_dir_all(&root);
    }
}
