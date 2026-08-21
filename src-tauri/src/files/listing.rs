use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::files::fs_ops::{guard_existing, system_time_to_rfc3339};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FsKind {
    File,
    Dir,
    Symlink,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GitStatus {
    Modified,
    Untracked,
    Staged,
    Ignored,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsEntry {
    pub name: String,
    pub path: String,
    pub kind: FsKind,
    pub size: u64,
    pub modified: String,
    pub extension: Option<String>,
    pub is_hidden: bool,
    pub is_package: bool,
    pub child_count: Option<u64>,
    pub git_status: Option<GitStatus>,
    pub project_framework: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortBy {
    Name,
    Size,
    Modified,
    Kind,
}

impl Default for SortBy {
    fn default() -> Self {
        SortBy::Name
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOptions {
    #[serde(default)]
    pub show_hidden: bool,
    #[serde(default)]
    pub sort_by: SortBy,
    #[serde(default)]
    pub sort_desc: bool,
}

fn is_package_dir(is_dir: bool, extension: &Option<String>) -> bool {
    if !is_dir {
        return false;
    }
    matches!(
        extension.as_deref(),
        Some("app") | Some("bundle") | Some("framework") | Some("plugin")
    )
}

const PROJECT_MARKERS: &[(&str, &str)] = &[
    ("package.json", "node"),
    ("Cargo.toml", "rust"),
    ("go.mod", "go"),
    ("pyproject.toml", "python"),
    ("requirements.txt", "python"),
    ("Gemfile", "rails"),
    ("composer.json", "laravel"),
    ("mix.exs", "phoenix"),
];

pub(crate) fn detect_framework_cheap(dir: &Path) -> Option<String> {
    for (marker, framework) in PROJECT_MARKERS {
        if dir.join(marker).is_file() {
            return Some((*framework).to_string());
        }
    }
    None
}

fn classify_status(status: git2::Status) -> Option<GitStatus> {
    use git2::Status;
    if status.intersects(
        Status::INDEX_NEW
            | Status::INDEX_MODIFIED
            | Status::INDEX_DELETED
            | Status::INDEX_RENAMED
            | Status::INDEX_TYPECHANGE,
    ) {
        Some(GitStatus::Staged)
    } else if status.contains(Status::WT_NEW) {
        Some(GitStatus::Untracked)
    } else if status.intersects(
        Status::WT_MODIFIED | Status::WT_DELETED | Status::WT_RENAMED | Status::WT_TYPECHANGE,
    ) {
        Some(GitStatus::Modified)
    } else if status.contains(Status::IGNORED) {
        Some(GitStatus::Ignored)
    } else {
        None
    }
}

fn git_status_map(dir: &Path) -> HashMap<String, GitStatus> {
    let mut map = HashMap::new();
    let repo = match git2::Repository::discover(dir) {
        Ok(r) => r,
        Err(_) => return map,
    };
    let workdir = match repo.workdir() {
        Some(w) => w,
        None => return map,
    };
    let rel_dir = match dir.strip_prefix(workdir) {
        Ok(r) => r,
        Err(_) => return map,
    };

    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true)
        .include_ignored(true)
        .recurse_untracked_dirs(false);
    if !rel_dir.as_os_str().is_empty() {
        opts.pathspec(rel_dir.to_string_lossy().as_ref());
    }

    let statuses = match repo.statuses(Some(&mut opts)) {
        Ok(s) => s,
        Err(_) => return map,
    };

    for entry in statuses.iter() {
        let Some(path) = entry.path() else { continue };
        let rel_path = Path::new(path);
        let Ok(from_dir) = rel_path.strip_prefix(rel_dir) else {
            continue;
        };
        let mut components = from_dir.components();
        let Some(first) = components.next() else {
            continue;
        };
        let name = first.as_os_str().to_string_lossy().to_string();
        let is_direct = components.next().is_none();
        let Some(status) = classify_status(entry.status()) else {
            continue;
        };
        map.entry(name)
            .and_modify(|existing| {
                if is_direct {
                    *existing = status;
                }
            })
            .or_insert(if is_direct {
                status
            } else {
                GitStatus::Modified
            });
    }

    map
}

pub fn list_dir(path: &str, opts: &ListOptions, roots: &[PathBuf]) -> Result<Vec<FsEntry>, String> {
    let resolved = guard_existing(path, roots)?;
    if !resolved.is_dir() {
        return Err(format!("{path} is not a directory"));
    }

    let statuses = git_status_map(&resolved);
    let read_dir = fs::read_dir(&resolved).map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for item in read_dir.flatten() {
        let name = item.file_name().to_string_lossy().to_string();
        let is_hidden = name.starts_with('.');
        if is_hidden && !opts.show_hidden {
            continue;
        }

        let symlink_meta = match item.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let is_symlink = symlink_meta.file_type().is_symlink();
        let followed_meta = if is_symlink {
            fs::metadata(item.path()).unwrap_or(symlink_meta.clone())
        } else {
            symlink_meta
        };

        let is_dir = followed_meta.is_dir();
        let kind = if is_symlink {
            FsKind::Symlink
        } else if is_dir {
            FsKind::Dir
        } else {
            FsKind::File
        };

        let extension = item
            .path()
            .extension()
            .map(|e| e.to_string_lossy().to_string());

        let entry_path = item.path();
        let is_package = is_package_dir(is_dir, &extension);

        let project_framework = if is_dir && !is_package {
            detect_framework_cheap(&entry_path)
        } else {
            None
        };

        entries.push(FsEntry {
            name: name.clone(),
            path: entry_path.to_string_lossy().to_string(),
            kind,
            size: if is_dir { 0 } else { followed_meta.len() },
            modified: followed_meta
                .modified()
                .map(system_time_to_rfc3339)
                .unwrap_or_default(),
            extension,
            is_hidden,
            is_package,
            child_count: None,
            git_status: statuses.get(&name).copied(),
            project_framework,
        });
    }

    sort_entries(&mut entries, opts.sort_by, opts.sort_desc);
    Ok(entries)
}

pub fn find_documents(root: &Path) -> Result<Vec<FsEntry>, String> {
    let mut entries = Vec::new();
    let walker = ignore::WalkBuilder::new(root)
        .hidden(true)
        .git_ignore(true)
        .git_exclude(true)
        .filter_entry(|entry| entry.file_name() != "node_modules")
        .build();

    for item in walker.flatten() {
        if !item.file_type().map(|kind| kind.is_file()).unwrap_or(false) {
            continue;
        }
        let extension = item
            .path()
            .extension()
            .map(|value| value.to_string_lossy().to_lowercase());
        if !matches!(
            extension.as_deref(),
            Some("md") | Some("markdown") | Some("pdf")
        ) {
            continue;
        }
        let metadata = match item.metadata() {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        let path = item.into_path();
        entries.push(FsEntry {
            name: path
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_default(),
            path: path.to_string_lossy().to_string(),
            kind: FsKind::File,
            size: metadata.len(),
            modified: metadata
                .modified()
                .map(system_time_to_rfc3339)
                .unwrap_or_default(),
            extension,
            is_hidden: false,
            is_package: false,
            child_count: None,
            git_status: None,
            project_framework: None,
        });
    }

    entries.sort_by(|a, b| a.path.to_lowercase().cmp(&b.path.to_lowercase()));
    Ok(entries)
}

fn sort_entries(entries: &mut [FsEntry], sort_by: SortBy, desc: bool) {
    entries.sort_by(|a, b| {
        let dir_rank = |e: &FsEntry| if e.kind == FsKind::File { 1 } else { 0 };
        let dir_order = dir_rank(a).cmp(&dir_rank(b));
        if dir_order != std::cmp::Ordering::Equal {
            return dir_order;
        }
        let ordering = match sort_by {
            SortBy::Name => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            SortBy::Size => a.size.cmp(&b.size),
            SortBy::Modified => a.modified.cmp(&b.modified),
            SortBy::Kind => a
                .extension
                .clone()
                .unwrap_or_default()
                .cmp(&b.extension.clone().unwrap_or_default()),
        };
        if desc {
            ordering.reverse()
        } else {
            ordering
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs as stdfs;

    fn tempdir() -> PathBuf {
        let mut dir = std::env::temp_dir();
        let unique = format!(
            "workbench-listing-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        dir.push(unique);
        stdfs::create_dir_all(&dir).unwrap();
        dir.canonicalize().unwrap()
    }

    #[test]
    fn dirs_sort_before_files_by_name() {
        let root = tempdir();
        stdfs::write(root.join("b.txt"), "").unwrap();
        stdfs::create_dir(root.join("a-dir")).unwrap();
        let roots = vec![root.clone()];
        let opts = ListOptions {
            show_hidden: false,
            sort_by: SortBy::Name,
            sort_desc: false,
        };
        let entries = list_dir(root.to_str().unwrap(), &opts, &roots).unwrap();
        assert_eq!(entries[0].name, "a-dir");
        assert_eq!(entries[0].kind, FsKind::Dir);
        assert_eq!(entries[1].name, "b.txt");
    }

    #[test]
    fn hidden_files_filtered_by_default() {
        let root = tempdir();
        stdfs::write(root.join(".secret"), "").unwrap();
        stdfs::write(root.join("visible.txt"), "").unwrap();
        let roots = vec![root.clone()];
        let opts = ListOptions {
            show_hidden: false,
            sort_by: SortBy::Name,
            sort_desc: false,
        };
        let entries = list_dir(root.to_str().unwrap(), &opts, &roots).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, "visible.txt");
    }

    #[test]
    fn hidden_files_included_when_requested() {
        let root = tempdir();
        stdfs::write(root.join(".secret"), "").unwrap();
        let roots = vec![root.clone()];
        let opts = ListOptions {
            show_hidden: true,
            sort_by: SortBy::Name,
            sort_desc: false,
        };
        let entries = list_dir(root.to_str().unwrap(), &opts, &roots).unwrap();
        let secret = entries
            .iter()
            .find(|e| e.name == ".secret")
            .expect("hidden file should be listed when show_hidden is set");
        assert!(secret.is_hidden);

        let hidden_opts = ListOptions {
            show_hidden: false,
            ..opts
        };
        let without = list_dir(root.to_str().unwrap(), &hidden_opts, &roots).unwrap();
        assert!(without.iter().all(|e| e.name != ".secret"));
    }

    #[test]
    fn sort_desc_reverses_order_within_dirs_then_files() {
        let root = tempdir();
        stdfs::write(root.join("a.txt"), "").unwrap();
        stdfs::write(root.join("z.txt"), "").unwrap();
        let roots = vec![root.clone()];
        let opts = ListOptions {
            show_hidden: false,
            sort_by: SortBy::Name,
            sort_desc: true,
        };
        let entries = list_dir(root.to_str().unwrap(), &opts, &roots).unwrap();
        assert_eq!(entries[0].name, "z.txt");
        assert_eq!(entries[1].name, "a.txt");
    }

    #[test]
    fn finds_documents_recursively_and_skips_other_files() {
        let root = tempdir();
        stdfs::create_dir(root.join("docs")).unwrap();
        stdfs::write(root.join("README.md"), "# Root").unwrap();
        stdfs::write(root.join("docs/guide.pdf"), "%PDF").unwrap();
        stdfs::write(root.join("docs/notes.txt"), "skip").unwrap();
        stdfs::create_dir(root.join("node_modules")).unwrap();
        stdfs::write(root.join("node_modules/package.md"), "skip").unwrap();

        let entries = find_documents(&root).unwrap();
        assert_eq!(entries.len(), 2);
        assert!(entries.iter().any(|entry| entry.name == "README.md"));
        assert!(entries.iter().any(|entry| entry.name == "guide.pdf"));
    }
}
