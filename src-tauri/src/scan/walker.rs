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
                if IGNORED_DIRS.contains(&name) {
                    return false;
                }
            }

            let names = read_child_names(entry.path()).unwrap_or_default();
            if detect::has_any_marker(&names) {
                found_in_filter.lock().unwrap().push(entry.path().to_path_buf());
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

    #[test]
    fn finds_a_single_project_at_root() {
        let tmp = tempfile::tempdir().unwrap();
        touch(&tmp.path().join("package.json"));

        let found = find_project_dirs(tmp.path());
        assert_eq!(found, vec![tmp.path().to_path_buf()]);
    }

    #[test]
    fn skips_ignored_directories() {
        let tmp = tempfile::tempdir().unwrap();
        let ignored = tmp.path().join("node_modules").join("some-pkg");
        fs::create_dir_all(&ignored).unwrap();
        touch(&ignored.join("package.json"));

        let real = tmp.path().join("real-project");
        fs::create_dir_all(&real).unwrap();
        touch(&real.join("package.json"));

        let found = find_project_dirs(tmp.path());
        assert_eq!(found, vec![real]);
    }

    #[test]
    fn stops_descending_once_project_is_identified() {
        let tmp = tempfile::tempdir().unwrap();
        let app = tmp.path().join("app");
        fs::create_dir_all(&app).unwrap();
        touch(&app.join("package.json"));

        let nested_fake = app.join("src").join("nested-project");
        fs::create_dir_all(&nested_fake).unwrap();
        touch(&nested_fake.join("package.json"));

        let found = find_project_dirs(tmp.path());
        assert_eq!(found, vec![app]);
    }

    #[test]
    fn tauri_nested_src_tauri_is_one_project_not_two() {
        let tmp = tempfile::tempdir().unwrap();
        let app = tmp.path().join("app");
        fs::create_dir_all(&app).unwrap();
        touch(&app.join("package.json"));
        touch(&app.join("vite.config.ts"));

        let src_tauri = app.join("src-tauri");
        fs::create_dir_all(&src_tauri).unwrap();
        touch(&src_tauri.join("tauri.conf.json"));
        touch(&src_tauri.join("Cargo.toml"));

        let found = find_project_dirs(tmp.path());
        assert_eq!(found, vec![app.clone()]);

        let entries = list_entries(&app);
        assert!(entries.iter().any(|e| e == "src-tauri/tauri.conf.json"));
    }

    #[test]
    fn finds_multiple_sibling_projects() {
        let tmp = tempfile::tempdir().unwrap();
        let one = tmp.path().join("one");
        let two = tmp.path().join("two");
        fs::create_dir_all(&one).unwrap();
        fs::create_dir_all(&two).unwrap();
        touch(&one.join("package.json"));
        touch(&two.join("Cargo.toml"));

        let mut found = find_project_dirs(tmp.path());
        found.sort();
        let mut expected = vec![one, two];
        expected.sort();
        assert_eq!(found, expected);
    }

    #[test]
    fn respects_max_depth() {
        let tmp = tempfile::tempdir().unwrap();
        let mut deep = tmp.path().to_path_buf();
        for i in 0..10 {
            deep = deep.join(format!("d{i}"));
        }
        fs::create_dir_all(&deep).unwrap();
        touch(&deep.join("package.json"));

        let found = find_project_dirs(tmp.path());
        assert!(found.is_empty());
    }
}
