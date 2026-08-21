use std::collections::HashSet;
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
const MAX_VIDEO_LINKS: usize = 200;
const MAX_VIDEO_SCAN_FILES: usize = 5_000;
const MAX_VIDEO_FILE_BYTES: u64 = 2 * 1024 * 1024;

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

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct VideoLink {
    pub provider: String,
    pub id: String,
    pub url: String,
    pub embed_url: String,
    pub source: String,
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
            entry.depth() == 0 || (!name.starts_with('.') && !SKIP_DIRS.contains(&name.as_ref()))
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

fn host(url: &str) -> Option<&str> {
    url.split_once("://")?
        .1
        .split('/')
        .next()
        .and_then(|authority| authority.rsplit('@').next())
        .and_then(|authority| authority.split(':').next())
}

fn clean_id(value: &str) -> String {
    value
        .chars()
        .take_while(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_'))
        .collect()
}

fn query_value(url: &str, key: &str) -> Option<String> {
    url.split_once('?')?
        .1
        .split(['&', '#'])
        .find_map(|part| part.split_once('=').filter(|(name, _)| *name == key))
        .map(|(_, value)| clean_id(value))
        .filter(|value| !value.is_empty())
}

fn path_value(url: &str, marker: &str) -> Option<String> {
    url.split(marker)
        .nth(1)
        .map(clean_id)
        .filter(|value| !value.is_empty())
}

fn parse_video_url(raw: &str, source: &str) -> Option<VideoLink> {
    let url = raw
        .trim_end_matches(|c: char| matches!(c, '.' | ',' | ';' | ':' | ')' | ']' | '}'))
        .replace("&amp;", "&");
    let hostname = host(&url)?.to_ascii_lowercase();

    let (provider, id, embed_url) = if hostname == "youtu.be" {
        let id = path_value(&url, "://youtu.be/")?;
        (
            "YouTube",
            id.clone(),
            format!("https://www.youtube.com/embed/{id}"),
        )
    } else if hostname == "youtube.com"
        || hostname.ends_with(".youtube.com")
        || hostname == "youtube-nocookie.com"
        || hostname.ends_with(".youtube-nocookie.com")
    {
        let id = query_value(&url, "v")
            .or_else(|| path_value(&url, "/embed/"))
            .or_else(|| path_value(&url, "/shorts/"))
            .or_else(|| path_value(&url, "/live/"))?;
        (
            "YouTube",
            id.clone(),
            format!("https://www.youtube.com/embed/{id}"),
        )
    } else if hostname == "vimeo.com" || hostname.ends_with(".vimeo.com") {
        let id = url
            .split(['/', '?', '#'])
            .find(|part| !part.is_empty() && part.chars().all(|c| c.is_ascii_digit()))?
            .to_string();
        (
            "Vimeo",
            id.clone(),
            format!("https://player.vimeo.com/video/{id}"),
        )
    } else if hostname == "wistia.net"
        || hostname.ends_with(".wistia.net")
        || hostname == "wistia.com"
        || hostname.ends_with(".wistia.com")
    {
        let id = path_value(&url, "/embed/iframe/")
            .or_else(|| path_value(&url, "/medias/"))
            .or_else(|| path_value(&url, "/s/"))?;
        (
            "Wistia",
            id.clone(),
            format!("https://fast.wistia.net/embed/iframe/{id}"),
        )
    } else if hostname == "voomly.com" || hostname.ends_with(".voomly.com") {
        let id = query_value(&url, "videoId").or_else(|| path_value(&url, "/v/"))?;
        (
            "Voomly",
            id.clone(),
            format!("https://embed.voomly.com/embed/assets/embed.html?videoId={id}&videoRatio=1.777778&type=v"),
        )
    } else if hostname == "loom.com" || hostname.ends_with(".loom.com") {
        let id = path_value(&url, "/share/").or_else(|| path_value(&url, "/embed/"))?;
        (
            "Loom",
            id.clone(),
            format!("https://www.loom.com/embed/{id}"),
        )
    } else {
        return None;
    };

    Some(VideoLink {
        provider: provider.to_string(),
        id,
        url,
        embed_url,
        source: source.to_string(),
    })
}

pub fn scan_video_links(root: &Path) -> Vec<VideoLink> {
    let url_pattern = regex::Regex::new(r#"https?://[^\s<>"'`]+"#).unwrap();
    let voomly_id_pattern = regex::Regex::new(r#"data-id\s*=\s*["']([^"']+)["']"#).unwrap();
    let mut links = Vec::new();
    let mut seen = HashSet::new();
    let walker = walkdir::WalkDir::new(root)
        .max_depth(MAX_DEPTH)
        .into_iter()
        .filter_entry(|entry| {
            let name = entry.file_name().to_string_lossy();
            entry.depth() == 0 || (!name.starts_with('.') && !SKIP_DIRS.contains(&name.as_ref()))
        });

    for entry in walker.flatten().take(MAX_VIDEO_SCAN_FILES) {
        if links.len() >= MAX_VIDEO_LINKS {
            break;
        }
        if !entry.file_type().is_file() {
            continue;
        }
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if metadata.len() > MAX_VIDEO_FILE_BYTES {
            continue;
        }
        let Ok(content) = std::fs::read_to_string(entry.path()) else {
            continue;
        };
        let source = entry
            .path()
            .strip_prefix(root)
            .unwrap_or(entry.path())
            .to_string_lossy()
            .to_string();
        let content = content.replace("\\/", "/");

        for found in url_pattern.find_iter(&content) {
            let Some(link) = parse_video_url(found.as_str(), &source) else {
                continue;
            };
            if seen.insert(link.embed_url.clone()) {
                links.push(link);
            }
        }

        if content.contains("voomly") {
            for capture in voomly_id_pattern.captures_iter(&content) {
                let Some(id) = capture.get(1).map(|value| clean_id(value.as_str())) else {
                    continue;
                };
                let url = format!("https://share.voomly.com/v/{id}");
                let Some(link) = parse_video_url(&url, &source) else {
                    continue;
                };
                if seen.insert(link.embed_url.clone()) {
                    links.push(link);
                }
            }
        }
    }

    links.sort_by(|a, b| (&a.provider, &a.source, &a.id).cmp(&(&b.provider, &b.source, &b.id)));
    links
}

#[tauri::command]
pub async fn project_videos(project_id: i64) -> Result<Vec<VideoLink>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db::open()?;
        let project = db::get_project(&conn, project_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("project {project_id} not found"))?;
        Ok(scan_video_links(Path::new(&project.path)))
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
        fs::create_dir_all(root.join(".claude/worktrees/copy")).unwrap();
        fs::write(root.join(".claude/worktrees/copy/icon.png"), [0u8; 4]).unwrap();
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

    #[test]
    fn finds_hosted_videos_and_skips_dependencies() {
        let root = temp("video-links");
        fs::create_dir_all(root.join("pages")).unwrap();
        fs::write(
            root.join("pages/index.html"),
            r#"https://youtu.be/abc_123
               https://www.youtube.com/watch?v=abc_123
               https://vimeo.com/76979871
               <script src="https://embed.voomly.com/embed/embed-build.js"></script>
               <div class="voomly-embed" data-id="voomly_123"></div>"#,
        )
        .unwrap();
        fs::create_dir_all(root.join("node_modules/pkg")).unwrap();
        fs::write(
            root.join("node_modules/pkg/readme.md"),
            "https://fast.wistia.net/embed/iframe/ignored123",
        )
        .unwrap();

        let links = scan_video_links(&root);
        assert_eq!(links.len(), 3);
        assert!(links.iter().any(|link| link.provider == "YouTube"));
        assert!(links.iter().any(|link| link.provider == "Vimeo"));
        assert!(links.iter().any(|link| link.provider == "Voomly"));
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn builds_embed_urls_for_supported_hosts() {
        let cases = [
            (
                "https://www.youtube.com/shorts/abc-123",
                "youtube.com/embed/abc-123",
            ),
            (
                "https://player.vimeo.com/video/76979871",
                "player.vimeo.com/video/76979871",
            ),
            (
                "https://demo.wistia.com/medias/zzm8qym2my",
                "fast.wistia.net/embed/iframe/zzm8qym2my",
            ),
            ("https://share.voomly.com/v/demo_123", "videoId=demo_123"),
            (
                "https://www.loom.com/share/demo-123",
                "loom.com/embed/demo-123",
            ),
        ];

        for (url, expected) in cases {
            assert!(parse_video_url(url, "README.md")
                .unwrap()
                .embed_url
                .contains(expected));
        }
    }
}
