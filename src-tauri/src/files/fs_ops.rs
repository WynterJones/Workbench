use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use rusqlite::Connection;
use serde::Serialize;

use crate::files::listing::FsKind;

const DIR_SIZE_ENTRY_CAP: usize = 200_000;

pub fn allowed_roots(conn: &Connection) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Some(home) = dirs::home_dir() {
        roots.push(home.canonicalize().unwrap_or(home));
    }

    let volumes = PathBuf::from("/Volumes");
    if volumes.exists() {
        roots.push(volumes.canonicalize().unwrap_or(volumes));
    }

    if let Ok(scan_roots) = crate::db::list_roots(conn) {
        for root in scan_roots {
            let path = PathBuf::from(&root.path);
            if let Ok(canonical) = path.canonicalize() {
                roots.push(canonical);
            } else {
                roots.push(path);
            }
        }
    }

    roots
}

fn ensure_within_roots(canonical: &Path, roots: &[PathBuf]) -> Result<(), String> {
    if canonical.to_string_lossy().contains("..") {
        return Err("path traversal rejected".to_string());
    }
    if roots.iter().any(|root| canonical.starts_with(root)) {
        Ok(())
    } else {
        Err(format!(
            "{} is outside allowed roots",
            canonical.display()
        ))
    }
}

pub fn guard_existing(path: &str, roots: &[PathBuf]) -> Result<PathBuf, String> {
    if path.trim().is_empty() {
        return Err("path is empty".to_string());
    }
    let candidate = PathBuf::from(path);
    if !candidate.is_absolute() {
        return Err("path must be absolute".to_string());
    }
    let canonical = candidate
        .canonicalize()
        .map_err(|e| format!("cannot resolve {path}: {e}"))?;
    ensure_within_roots(&canonical, roots)?;
    Ok(canonical)
}

pub fn guard_new(path: &str, roots: &[PathBuf]) -> Result<PathBuf, String> {
    if path.trim().is_empty() {
        return Err("path is empty".to_string());
    }
    let candidate = PathBuf::from(path);
    if !candidate.is_absolute() {
        return Err("path must be absolute".to_string());
    }
    let file_name = candidate
        .file_name()
        .ok_or_else(|| "path has no file name".to_string())?
        .to_string_lossy()
        .to_string();
    validate_entry_name(&file_name)?;
    let parent = candidate
        .parent()
        .ok_or_else(|| "path has no parent".to_string())?;
    let canonical_parent = parent
        .canonicalize()
        .map_err(|e| format!("cannot resolve parent of {path}: {e}"))?;
    ensure_within_roots(&canonical_parent, roots)?;
    Ok(canonical_parent.join(file_name))
}

fn validate_entry_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name == "." || name == ".." || name.contains('/') || name.contains('\0')
    {
        return Err(format!("invalid entry name: {name}"));
    }
    Ok(())
}

pub fn system_time_to_rfc3339(time: SystemTime) -> String {
    chrono::DateTime::<chrono::Utc>::from(time).to_rfc3339()
}

pub fn create_dir(path: &str, roots: &[PathBuf]) -> Result<String, String> {
    let target = guard_new(path, roots)?;
    fs::create_dir(&target).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

pub fn create_file(path: &str, contents: &str, roots: &[PathBuf]) -> Result<String, String> {
    let target = guard_new(path, roots)?;
    fs::write(&target, contents).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

pub fn rename(path: &str, new_name: &str, roots: &[PathBuf]) -> Result<String, String> {
    validate_entry_name(new_name)?;
    let source = guard_existing(path, roots)?;
    let parent = source
        .parent()
        .ok_or_else(|| "path has no parent".to_string())?;
    let target = parent.join(new_name);
    if target.exists() {
        return Err(format!("{new_name} already exists"));
    }
    fs::rename(&source, &target).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

pub fn unique_name_in(dest_dir: &Path, original_name: &str) -> String {
    let path = Path::new(original_name);
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| original_name.to_string());
    let ext = path.extension().map(|e| e.to_string_lossy().to_string());

    let make = |suffix: &str| -> String {
        match &ext {
            Some(e) => format!("{stem}{suffix}.{e}"),
            None => format!("{stem}{suffix}"),
        }
    };

    let plain = make("");
    if !dest_dir.join(&plain).exists() {
        return plain;
    }

    let first_copy = make(" copy");
    if !dest_dir.join(&first_copy).exists() {
        return first_copy;
    }

    let mut n = 2;
    loop {
        let candidate = make(&format!(" copy {n}"));
        if !dest_dir.join(&candidate).exists() {
            return candidate;
        }
        n += 1;
    }
}

fn copy_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    let file_type = fs::symlink_metadata(src)?.file_type();
    if file_type.is_symlink() {
        let target = fs::read_link(src)?;
        #[cfg(unix)]
        std::os::unix::fs::symlink(target, dst)?;
        #[cfg(not(unix))]
        let _ = target;
        return Ok(());
    }
    if file_type.is_dir() {
        fs::create_dir_all(dst)?;
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let dest_path = dst.join(entry.file_name());
            copy_recursive(&entry.path(), &dest_path)?;
        }
        Ok(())
    } else {
        fs::copy(src, dst)?;
        Ok(())
    }
}

pub fn copy_entries(
    paths: &[String],
    dest_dir: &str,
    roots: &[PathBuf],
) -> Result<Vec<String>, String> {
    let dest = guard_existing(dest_dir, roots)?;
    if !dest.is_dir() {
        return Err(format!("{dest_dir} is not a directory"));
    }
    let mut results = Vec::with_capacity(paths.len());
    for path in paths {
        let source = guard_existing(path, roots)?;
        let name = source
            .file_name()
            .ok_or_else(|| "path has no file name".to_string())?
            .to_string_lossy()
            .to_string();
        let target_name = unique_name_in(&dest, &name);
        let target = dest.join(&target_name);
        copy_recursive(&source, &target).map_err(|e| e.to_string())?;
        results.push(target.to_string_lossy().to_string());
    }
    Ok(results)
}

pub fn move_entries(
    paths: &[String],
    dest_dir: &str,
    roots: &[PathBuf],
) -> Result<Vec<String>, String> {
    let dest = guard_existing(dest_dir, roots)?;
    if !dest.is_dir() {
        return Err(format!("{dest_dir} is not a directory"));
    }
    let mut results = Vec::with_capacity(paths.len());
    for path in paths {
        let source = guard_existing(path, roots)?;
        let name = source
            .file_name()
            .ok_or_else(|| "path has no file name".to_string())?
            .to_string_lossy()
            .to_string();
        let target_name = unique_name_in(&dest, &name);
        let target = dest.join(&target_name);
        match fs::rename(&source, &target) {
            Ok(()) => {}
            Err(_) => {
                copy_recursive(&source, &target).map_err(|e| e.to_string())?;
                if source.is_dir() {
                    fs::remove_dir_all(&source).map_err(|e| e.to_string())?;
                } else {
                    fs::remove_file(&source).map_err(|e| e.to_string())?;
                }
            }
        }
        results.push(target.to_string_lossy().to_string());
    }
    Ok(results)
}

pub fn trash_entries(paths: &[String], roots: &[PathBuf]) -> Result<(), String> {
    let mut resolved = Vec::with_capacity(paths.len());
    for path in paths {
        resolved.push(guard_existing(path, roots)?);
    }
    trash::delete_all(&resolved).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsInfo {
    pub path: String,
    pub kind: FsKind,
    pub size: u64,
    pub truncated: bool,
    pub created: Option<String>,
    pub modified: Option<String>,
    pub accessed: Option<String>,
    pub permissions: String,
}

fn dir_size(path: &Path, cap: usize) -> (u64, bool) {
    let mut total: u64 = 0;
    let mut visited = 0usize;
    let mut truncated = false;
    for entry in walkdir::WalkDir::new(path).into_iter().flatten() {
        if visited >= cap {
            truncated = true;
            break;
        }
        visited += 1;
        if let Ok(metadata) = entry.metadata() {
            if metadata.is_file() {
                total += metadata.len();
            }
        }
    }
    (total, truncated)
}

fn permissions_string(metadata: &fs::Metadata) -> String {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        format!("{:o}", metadata.permissions().mode() & 0o777)
    }
    #[cfg(not(unix))]
    {
        if metadata.permissions().readonly() {
            "444".to_string()
        } else {
            "644".to_string()
        }
    }
}

pub fn get_info(path: &str, roots: &[PathBuf]) -> Result<FsInfo, String> {
    let resolved = guard_existing(path, roots)?;
    let metadata = fs::metadata(&resolved).map_err(|e| e.to_string())?;
    let kind = if metadata.is_dir() {
        FsKind::Dir
    } else {
        FsKind::File
    };
    let (size, truncated) = if metadata.is_dir() {
        dir_size(&resolved, DIR_SIZE_ENTRY_CAP)
    } else {
        (metadata.len(), false)
    };
    Ok(FsInfo {
        path: resolved.to_string_lossy().to_string(),
        kind,
        size,
        truncated,
        created: metadata.created().ok().map(system_time_to_rfc3339),
        modified: metadata.modified().ok().map(system_time_to_rfc3339),
        accessed: metadata.accessed().ok().map(system_time_to_rfc3339),
        permissions: permissions_string(&metadata),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs as stdfs;

    fn tempdir() -> PathBuf {
        let mut dir = std::env::temp_dir();
        let unique = format!(
            "workbench-test-{}-{}",
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
    fn guard_existing_allows_path_within_root() {
        let root = tempdir();
        let file = root.join("a.txt");
        stdfs::write(&file, "hi").unwrap();
        let roots = vec![root.clone()];
        let result = guard_existing(file.to_str().unwrap(), &roots);
        assert!(result.is_ok());
    }

    #[test]
    fn guard_existing_rejects_traversal_outside_root() {
        let root = tempdir();
        let outside = tempdir();
        let outside_file = outside.join("secret.txt");
        stdfs::write(&outside_file, "nope").unwrap();
        let traversal = root.join("..").join(outside.file_name().unwrap()).join("secret.txt");
        let roots = vec![root];
        let result = guard_existing(traversal.to_str().unwrap(), &roots);
        assert!(result.is_err());
    }

    #[test]
    fn guard_existing_rejects_path_outside_allowed_roots() {
        let root = tempdir();
        let other = tempdir();
        let file = other.join("b.txt");
        stdfs::write(&file, "hi").unwrap();
        let roots = vec![root];
        let result = guard_existing(file.to_str().unwrap(), &roots);
        assert!(result.is_err());
    }

    #[test]
    fn guard_existing_rejects_symlink_escape() {
        let root = tempdir();
        let outside = tempdir();
        let outside_file = outside.join("secret.txt");
        stdfs::write(&outside_file, "nope").unwrap();
        let link = root.join("escape");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside_file, &link).unwrap();
        let roots = vec![root];
        let result = guard_existing(link.to_str().unwrap(), &roots);
        assert!(result.is_err());
    }

    #[test]
    fn guard_new_allows_new_file_in_existing_root() {
        let root = tempdir();
        let target = root.join("new.txt");
        let roots = vec![root];
        let result = guard_new(target.to_str().unwrap(), &roots);
        assert!(result.is_ok());
    }

    #[test]
    fn guard_new_rejects_traversal_name() {
        let root = tempdir();
        let target = root.join("..");
        let roots = vec![root];
        let result = guard_new(target.to_str().unwrap(), &roots);
        assert!(result.is_err());
    }

    #[test]
    fn unique_name_in_matches_finder_pattern() {
        let root = tempdir();
        stdfs::write(root.join("foo.txt"), "1").unwrap();
        assert_eq!(unique_name_in(&root, "foo.txt"), "foo copy.txt");
        stdfs::write(root.join("foo copy.txt"), "2").unwrap();
        assert_eq!(unique_name_in(&root, "foo.txt"), "foo copy 2.txt");
        stdfs::write(root.join("foo copy 2.txt"), "3").unwrap();
        assert_eq!(unique_name_in(&root, "foo.txt"), "foo copy 3.txt");
    }

    #[test]
    fn unique_name_in_returns_original_when_no_collision() {
        let root = tempdir();
        assert_eq!(unique_name_in(&root, "bar.txt"), "bar.txt");
    }

    #[test]
    fn copy_entries_resolves_collisions() {
        let root = tempdir();
        let dest = tempdir();
        let src = root.join("foo");
        stdfs::write(&src, "1").unwrap();
        stdfs::write(dest.join("foo"), "existing").unwrap();
        let roots = vec![root.clone(), dest.clone()];
        let result = copy_entries(&[src.to_string_lossy().to_string()], dest.to_str().unwrap(), &roots)
            .unwrap();
        assert_eq!(result.len(), 1);
        assert!(result[0].ends_with("foo copy"));
    }
}
