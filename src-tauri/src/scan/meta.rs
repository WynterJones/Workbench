use std::fs;
use std::path::Path;
use std::time::SystemTime;

use crate::scan::walker::IGNORED_DIRS;

const SOURCE_EXTENSIONS: &[&str] = &[
    "rs", "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "rb", "php", "c", "cpp", "h",
    "hpp", "java", "kt", "swift", "css", "scss", "html", "vue", "svelte", "gd",
];

const MAX_FILES: usize = 20_000;
const README_MAX_LEN: usize = 200;

pub struct SourceScan {
    pub loc: i64,
    pub last_modified: Option<SystemTime>,
}

pub fn scan_source(dir: &Path) -> SourceScan {
    let mut loc = 0i64;
    let mut last_modified: Option<SystemTime> = None;
    let mut visited = 0usize;
    walk(dir, &mut loc, &mut last_modified, &mut visited);
    SourceScan { loc, last_modified }
}

fn walk(dir: &Path, loc: &mut i64, last_modified: &mut Option<SystemTime>, visited: &mut usize) {
    if *visited >= MAX_FILES {
        return;
    }
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        if *visited >= MAX_FILES {
            return;
        }

        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };
        if file_type.is_symlink() {
            continue;
        }

        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();

        if file_type.is_dir() {
            if IGNORED_DIRS.contains(&name.as_ref()) {
                continue;
            }
            walk(&path, loc, last_modified, visited);
            continue;
        }

        *visited += 1;

        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());

        let Some(ext) = ext else { continue };
        if !SOURCE_EXTENSIONS.contains(&ext.as_str()) {
            continue;
        }

        if let Ok(content) = fs::read_to_string(&path) {
            *loc += content.lines().count() as i64;
        }
        if let Ok(meta) = entry.metadata() {
            if let Ok(modified) = meta.modified() {
                if last_modified.map(|lm| modified > lm).unwrap_or(true) {
                    *last_modified = Some(modified);
                }
            }
        }
    }
}

pub fn readme_summary(dir: &Path) -> Option<String> {
    let candidates = ["README.md", "Readme.md", "readme.md", "README", "README.txt"];
    let path = candidates
        .iter()
        .map(|c| dir.join(c))
        .find(|p| p.is_file())?;
    let content = fs::read_to_string(path).ok()?;
    first_paragraph(&content)
}

fn first_paragraph(content: &str) -> Option<String> {
    let mut paragraph = String::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            if !paragraph.is_empty() {
                break;
            }
            continue;
        }
        if trimmed.starts_with('#') {
            continue;
        }
        if trimmed.starts_with("[![") || trimmed.starts_with("![") {
            continue;
        }
        if !paragraph.is_empty() {
            paragraph.push(' ');
        }
        paragraph.push_str(trimmed);
    }

    let cleaned: String = paragraph.chars().filter(|c| *c != '`').collect();
    let cleaned = cleaned.trim();
    if cleaned.is_empty() {
        return None;
    }
    Some(truncate(cleaned, README_MAX_LEN))
}

fn truncate(text: &str, max_len: usize) -> String {
    if text.chars().count() <= max_len {
        return text.to_string();
    }
    let truncated: String = text.chars().take(max_len).collect();
    format!("{}…", truncated.trim_end())
}

pub fn deps_installed(dir: &Path) -> bool {
    ["node_modules", "vendor", "target"]
        .iter()
        .any(|d| dir.join(d).is_dir())
}

pub fn has_env_example(dir: &Path) -> bool {
    dir.join(".env.example").is_file()
}

pub fn last_modified_or_dir(dir: &Path, scanned: Option<SystemTime>) -> SystemTime {
    scanned
        .or_else(|| fs::metadata(dir).and_then(|m| m.modified()).ok())
        .unwrap_or_else(SystemTime::now)
}

pub fn to_rfc3339(time: SystemTime) -> String {
    chrono::DateTime::<chrono::Utc>::from(time).to_rfc3339()
}
