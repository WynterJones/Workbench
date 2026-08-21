use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::db;

const MAX_LINES: usize = 14;
const MAX_LINE_CHARS: usize = 88;
const MAX_FILE_BYTES: u64 = 512 * 1024;

const CANDIDATES: [&str; 22] = [
    "src/App.tsx",
    "src/App.jsx",
    "app/page.tsx",
    "src/routes/index.tsx",
    "src/main.tsx",
    "src/main.ts",
    "src/index.ts",
    "src/index.js",
    "index.js",
    "src/lib.rs",
    "src/main.rs",
    "main.go",
    "cmd/main.go",
    "app.py",
    "main.py",
    "src/App.vue",
    "src/App.svelte",
    "app/controllers/application_controller.rb",
    "config/routes.rb",
    "content.js",
    "background.js",
    "index.html",
];

const SOURCE_EXTENSIONS: [&str; 16] = [
    "ts", "tsx", "js", "jsx", "rs", "go", "py", "rb", "vue", "svelte", "php", "swift", "kt",
    "java", "c", "cpp",
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snippet {
    pub file: String,
    pub language: String,
    pub lines: Vec<String>,
}

fn language_for(path: &Path) -> String {
    match path.extension().and_then(|e| e.to_str()).unwrap_or("") {
        "ts" | "tsx" => "typescript",
        "js" | "jsx" | "mjs" | "cjs" => "javascript",
        "rs" => "rust",
        "go" => "go",
        "py" => "python",
        "rb" => "ruby",
        "vue" => "vue",
        "svelte" => "svelte",
        "php" => "php",
        "html" => "html",
        other => other,
    }
    .to_string()
}

fn pick_file(root: &Path) -> Option<PathBuf> {
    for candidate in CANDIDATES {
        let path = root.join(candidate);
        if path.is_file() {
            return Some(path);
        }
    }

    let mut best: Option<(u64, PathBuf)> = None;
    for entry in walkdir::WalkDir::new(root)
        .max_depth(3)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !matches!(
                name.as_ref(),
                "node_modules" | ".git" | "target" | "dist" | "build" | "vendor" | ".next"
            )
        })
        .flatten()
    {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if !SOURCE_EXTENSIONS.contains(&ext) {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };
        if meta.len() > MAX_FILE_BYTES {
            continue;
        }
        if best
            .as_ref()
            .map(|(size, _)| meta.len() > *size)
            .unwrap_or(true)
        {
            best = Some((meta.len(), path.to_path_buf()));
        }
    }

    best.map(|(_, path)| path)
}

pub fn extract(root: &Path) -> Option<Snippet> {
    let file = pick_file(root)?;
    let contents = fs::read_to_string(&file).ok()?;

    let lines: Vec<String> = contents
        .lines()
        .skip_while(|line| line.trim().is_empty())
        .take(MAX_LINES)
        .map(|line| {
            let trimmed = line.trim_end();
            if trimmed.chars().count() > MAX_LINE_CHARS {
                trimmed.chars().take(MAX_LINE_CHARS).collect()
            } else {
                trimmed.to_string()
            }
        })
        .collect();

    if lines.iter().all(|line| line.trim().is_empty()) {
        return None;
    }

    Some(Snippet {
        file: file
            .strip_prefix(root)
            .unwrap_or(&file)
            .to_string_lossy()
            .to_string(),
        language: language_for(&file),
        lines,
    })
}

#[tauri::command]
pub async fn project_snippet(project_id: i64) -> Result<Option<Snippet>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let conn = db::open()?;
        let project = db::get_project(&conn, project_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("project {project_id} not found"))?;
        Ok(extract(Path::new(&project.path)))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("wb_snippet_{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn prefers_a_known_entry_point_over_a_bigger_file() {
        let root = temp("entry");
        fs::create_dir_all(root.join("src")).unwrap();
        fs::write(root.join("src/App.tsx"), "export function App() {}\n").unwrap();
        fs::write(root.join("src/huge.ts"), "x\n".repeat(5000)).unwrap();

        let snippet = extract(&root).unwrap();
        assert_eq!(snippet.file, "src/App.tsx");
        assert_eq!(snippet.language, "typescript");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn falls_back_to_the_largest_source_file() {
        let root = temp("fallback");
        fs::write(root.join("small.rs"), "fn a() {}\n").unwrap();
        fs::write(root.join("big.rs"), "fn b() {}\n".repeat(40)).unwrap();

        let snippet = extract(&root).unwrap();
        assert_eq!(snippet.file, "big.rs");
        assert_eq!(snippet.language, "rust");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn skips_leading_blank_lines_and_caps_length() {
        let root = temp("trim");
        let body = format!("\n\n\n{}", "let value = 1;\n".repeat(40));
        fs::write(root.join("main.ts"), body).unwrap();

        let snippet = extract(&root).unwrap();
        assert_eq!(snippet.lines.len(), MAX_LINES);
        assert_eq!(snippet.lines[0], "let value = 1;");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn ignores_dependency_directories() {
        let root = temp("deps");
        fs::create_dir_all(root.join("node_modules/pkg")).unwrap();
        fs::write(root.join("node_modules/pkg/index.js"), "x\n".repeat(900)).unwrap();
        fs::write(root.join("tiny.js"), "const a = 1;\n").unwrap();

        let snippet = extract(&root).unwrap();
        assert_eq!(snippet.file, "tiny.js");
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn returns_none_when_there_is_no_source() {
        let root = temp("empty");
        fs::write(root.join("README.md"), "# hi").unwrap();
        assert!(extract(&root).is_none());
        let _ = fs::remove_dir_all(&root);
    }
}
