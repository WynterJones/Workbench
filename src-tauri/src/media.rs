use std::path::Path;

use serde::Serialize;

use crate::db;

const IMAGE_EXTS: [&str; 8] = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"];
const VIDEO_EXTS: [&str; 5] = ["mp4", "webm", "mov", "m4v", "avi"];
const SKIP_DIRS: [&str; 11] = [
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "venv",
    ".venv",
    "Pods",
    "__pycache__",
];
const MAX_ITEMS: usize = 600;
const MAX_DEPTH: usize = 6;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub path: String,
    pub name: String,
    pub relative: String,
    pub kind: String,
    pub extension: String,
    pub size_bytes: u64,
    pub modified: Option<String>,
}

fn classify(extension: &str) -> Option<&'static str> {
    let ext = extension.to_lowercase();
    if IMAGE_EXTS.contains(&ext.as_str()) {
        Some("image")
    } else if VIDEO_EXTS.contains(&ext.as_str()) {
        Some("video")
    } else {
        None
    }
}

pub fn scan_media(root: &Path) -> Vec<MediaItem> {
    let mut items = Vec::new();

    let walker = walkdir::WalkDir::new(root)
        .max_depth(MAX_DEPTH)
        .into_iter()
        .filter_entry(|entry| {
            let name = entry.file_name().to_string_lossy();
            !SKIP_DIRS.contains(&name.as_ref())
        });

    for entry in walker.flatten() {
        if items.len() >= MAX_ITEMS {
            break;
        }
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let extension = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        let Some(kind) = classify(&extension) else {
            continue;
        };
        let Ok(meta) = entry.metadata() else { continue };

        let modified = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .and_then(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0))
            .map(|d| d.to_rfc3339());

        items.push(MediaItem {
            name: entry.file_name().to_string_lossy().to_string(),
            relative: path
                .strip_prefix(root)
                .unwrap_or(path)
                .to_string_lossy()
                .to_string(),
            path: path.to_string_lossy().to_string(),
            kind: kind.to_string(),
            extension,
            size_bytes: meta.len(),
            modified,
        });
    }

    items.sort_by(|a, b| a.relative.to_lowercase().cmp(&b.relative.to_lowercase()));
    items
}

#[tauri::command]
pub async fn project_media(project_id: i64) -> Result<Vec<MediaItem>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db::open()?;
        let project = db::get_project(&conn, project_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("project {project_id} not found"))?;
        Ok(scan_media(Path::new(&project.path)))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn media_details(paths: Vec<String>) -> Result<Vec<MediaItem>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut items = Vec::new();
        for raw in paths {
            let path = Path::new(&raw);
            if !path.is_file() {
                continue;
            }
            let extension = path
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            let Some(kind) = classify(&extension) else {
                continue;
            };
            let Ok(meta) = std::fs::metadata(path) else {
                continue;
            };
            let modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .and_then(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0))
                .map(|d| d.to_rfc3339());

            items.push(MediaItem {
                name: path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default(),
                relative: raw.clone(),
                path: raw,
                kind: kind.to_string(),
                extension,
                size_bytes: meta.len(),
                modified,
            });
        }
        Ok(items)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("wb_media_{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn classifies_images_and_videos_only() {
        assert_eq!(classify("PNG"), Some("image"));
        assert_eq!(classify("mp4"), Some("video"));
        assert_eq!(classify("ts"), None);
        assert_eq!(classify(""), None);
    }

    #[test]
    fn finds_media_and_ignores_source_files() {
        let root = temp("basic");
        fs::write(root.join("logo.png"), [0u8; 10]).unwrap();
        fs::write(root.join("demo.mp4"), [0u8; 10]).unwrap();
        fs::write(root.join("main.ts"), "x").unwrap();

        let items = scan_media(&root);
        assert_eq!(items.len(), 2);
        assert!(items.iter().any(|i| i.kind == "image"));
        assert!(items.iter().any(|i| i.kind == "video"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn skips_dependency_directories() {
        let root = temp("skip");
        fs::create_dir_all(root.join("node_modules/pkg")).unwrap();
        fs::write(root.join("node_modules/pkg/icon.png"), [0u8; 4]).unwrap();
        fs::write(root.join("real.png"), [0u8; 4]).unwrap();

        let items = scan_media(&root);
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].name, "real.png");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn records_a_path_relative_to_the_project() {
        let root = temp("relative");
        fs::create_dir_all(root.join("assets/img")).unwrap();
        fs::write(root.join("assets/img/hero.jpg"), [0u8; 4]).unwrap();

        let items = scan_media(&root);
        assert_eq!(items[0].relative, "assets/img/hero.jpg");
        assert!(items[0].path.ends_with("assets/img/hero.jpg"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn returns_nothing_for_a_missing_directory() {
        assert!(scan_media(Path::new("/definitely/not/here")).is_empty());
    }
}
