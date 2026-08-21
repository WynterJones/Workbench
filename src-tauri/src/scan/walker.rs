use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use ignore::WalkBuilder;

use crate::scan::detect;

pub const IGNORED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    "vendor",
    "gems",
    ".next",
    ".nuxt",
    "Pods",
    "venv",
    ".venv",
    "__pycache__",
    ".cache",
    "Library",
    ".Trash",
];

const MAX_DEPTH: usize = 6;

pub fn find_project_dirs(root: &Path) -> Vec<PathBuf> {
    if root
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.starts_with('.'))
    {
        return Vec::new();
    }

    let root_entries = read_child_names(root).unwrap_or_default();
    if detect::has_any_marker(&root_entries) {
        return vec![root.to_path_buf()];
    }

    let found = Arc::new(Mutex::new(Vec::new()));
    let found_in_filter = Arc::clone(&found);

    let walker = WalkBuilder::new(root)
        .max_depth(Some(MAX_DEPTH))
        .follow_links(false)
        .standard_filters(false)
        .filter_entry(move |entry| {
            let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
            if !is_dir {
                return true;
            }

            if entry.depth() == 0 {
                return true;
            }

            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with('.') || IGNORED_DIRS.contains(&name) {
                    return false;
                }
            }

            let names = read_child_names(entry.path()).unwrap_or_default();
            if detect::has_any_marker(&names) {
                found_in_filter
                    .lock()
                    .unwrap()
                    .push(entry.path().to_path_buf());
                return false;
            }

            true
        })
        .build();

    for _ in walker {}

    Arc::try_unwrap(found)
        .map(|f| f.into_inner().unwrap())
        .unwrap_or_default()
}

fn read_child_names(dir: &Path) -> Option<Vec<String>> {
    let entries = fs::read_dir(dir).ok()?;
    let mut names = Vec::new();
    for entry in entries.flatten() {
        names.push(entry.file_name().to_string_lossy().to_string());
    }
    Some(names)
}

pub fn list_entries(dir: &Path) -> Vec<String> {
    let mut entries = read_child_names(dir).unwrap_or_default();
    for nested in [
        "src-tauri/tauri.conf.json",
        "config/application.rb",
        "src-tauri/Cargo.toml",
        ".github/workflows",
    ] {
        if dir.join(nested).exists() {
            entries.push(nested.to_string());
        }
    }
    entries
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn touch(path: &Path) {
        fs::write(path, "").unwrap();
    }

    fn temp_root() -> (tempfile::TempDir, PathBuf) {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path().join("root");
        fs::create_dir(&root).unwrap();
        (tmp, root)
    }

    #[test]
    fn finds_a_single_project_at_root() {
        let (_tmp, root) = temp_root();
        touch(&root.join("package.json"));

        let found = find_project_dirs(&root);
        assert_eq!(found, vec![root]);
    }

    #[test]
    fn skips_ignored_directories() {
        let (_tmp, root) = temp_root();
        let ignored = root.join("node_modules").join("some-pkg");
        fs::create_dir_all(&ignored).unwrap();
        touch(&ignored.join("package.json"));

        let gem = root.join("gems").join("bcrypt_pbkdf-1.1.2");
        fs::create_dir_all(&gem).unwrap();
        touch(&gem.join("Cargo.toml"));

        let hidden = root.join(".ruby-lsp");
        fs::create_dir_all(&hidden).unwrap();
        touch(&hidden.join("Cargo.toml"));

        let npx = root.join(".npm").join("_npx").join("1a089ac50f181916");
        fs::create_dir_all(&npx).unwrap();
        touch(&npx.join("package.json"));

        let real = root.join("real-project");
        fs::create_dir_all(&real).unwrap();
        touch(&real.join("package.json"));

        let found = find_project_dirs(&root);
        assert_eq!(found, vec![real]);
        assert!(find_project_dirs(&hidden).is_empty());
    }

    #[test]
    fn stops_descending_once_project_is_identified() {
        let (_tmp, root) = temp_root();
        let app = root.join("app");
        fs::create_dir_all(&app).unwrap();
        touch(&app.join("package.json"));

        let nested_fake = app.join("src").join("nested-project");
        fs::create_dir_all(&nested_fake).unwrap();
        touch(&nested_fake.join("package.json"));

        let found = find_project_dirs(&root);
        assert_eq!(found, vec![app]);
    }

    #[test]
    fn tauri_nested_src_tauri_is_one_project_not_two() {
        let (_tmp, root) = temp_root();
        let app = root.join("app");
        fs::create_dir_all(&app).unwrap();
        touch(&app.join("package.json"));
        touch(&app.join("vite.config.ts"));

        let src_tauri = app.join("src-tauri");
        fs::create_dir_all(&src_tauri).unwrap();
        touch(&src_tauri.join("tauri.conf.json"));
        touch(&src_tauri.join("Cargo.toml"));

        let found = find_project_dirs(&root);
        assert_eq!(found, vec![app.clone()]);

        let entries = list_entries(&app);
        assert!(entries.iter().any(|e| e == "src-tauri/tauri.conf.json"));
    }

    #[test]
    fn finds_multiple_sibling_projects() {
        let (_tmp, root) = temp_root();
        let one = root.join("one");
        let two = root.join("two");
        fs::create_dir_all(&one).unwrap();
        fs::create_dir_all(&two).unwrap();
        touch(&one.join("package.json"));
        touch(&two.join("Cargo.toml"));

        let mut found = find_project_dirs(&root);
        found.sort();
        let mut expected = vec![one, two];
        expected.sort();
        assert_eq!(found, expected);
    }

    #[test]
    fn respects_max_depth() {
        let (_tmp, root) = temp_root();
        let mut deep = root.clone();
        for i in 0..10 {
            deep = deep.join(format!("d{i}"));
        }
        fs::create_dir_all(&deep).unwrap();
        touch(&deep.join("package.json"));

        let found = find_project_dirs(&root);
        assert!(found.is_empty());
    }
}
