use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::db;
use crate::run::capture::shots_dir;

pub const ALLOWED_EXTENSIONS: [&str; 6] = ["png", "jpg", "jpeg", "gif", "webp", "avif"];
pub const MAX_IMAGE_BYTES: usize = 25 * 1024 * 1024;

pub fn extension_of(path: &Path) -> Option<String> {
    let ext = path.extension()?.to_string_lossy().to_lowercase();
    ALLOWED_EXTENSIONS.contains(&ext.as_str()).then_some(ext)
}

fn destination(project_id: i64, variant: &str, ext: &str) -> Result<PathBuf, String> {
    let dir = shots_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{project_id}-{variant}-custom.{ext}")))
}

fn record(project_id: i64, variant: &str, path: &Path) -> Result<String, String> {
    let conn = db::open()?;
    let as_string = path.to_string_lossy().to_string();
    db::upsert_screenshot(&conn, project_id, variant, &as_string).map_err(|e| e.to_string())?;
    let _ = db::insert_activity(
        &conn,
        project_id,
        crate::models::ActivityKind::Screenshot,
        None,
        Some("Added manually".to_string()),
    );
    Ok(as_string)
}

fn clear_previous(project_id: i64, variant: &str) {
    for ext in ALLOWED_EXTENSIONS {
        let _ = fs::remove_file(shots_dir().join(format!("{project_id}-{variant}-custom.{ext}")));
    }
}

#[tauri::command]
pub fn import_screenshot_file(
    project_id: i64,
    variant: String,
    source_path: String,
) -> Result<String, String> {
    let source = Path::new(&source_path);
    if !source.is_file() {
        return Err(format!("{source_path} is not a file"));
    }
    let ext = extension_of(source)
        .ok_or_else(|| "Only png, jpg, gif, webp and avif images are supported".to_string())?;

    let meta = fs::metadata(source).map_err(|e| e.to_string())?;
    if meta.len() as usize > MAX_IMAGE_BYTES {
        return Err("That image is larger than 25 MB".into());
    }

    clear_previous(project_id, &variant);
    let target = destination(project_id, &variant, &ext)?;
    fs::copy(source, &target).map_err(|e| e.to_string())?;
    record(project_id, &variant, &target)
}

#[tauri::command]
pub fn import_screenshot_bytes(
    project_id: i64,
    variant: String,
    bytes: Vec<u8>,
    extension: String,
) -> Result<String, String> {
    let ext = extension.to_lowercase();
    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err("Only png, jpg, gif, webp and avif images are supported".into());
    }
    if bytes.len() > MAX_IMAGE_BYTES {
        return Err("That image is larger than 25 MB".into());
    }
    if bytes.is_empty() {
        return Err("The pasted image was empty".into());
    }

    clear_previous(project_id, &ext);
    let target = destination(project_id, &variant, &ext)?;
    fs::write(&target, &bytes).map_err(|e| e.to_string())?;
    record(project_id, &variant, &target)
}

#[tauri::command]
pub fn pick_image_file() -> Result<Option<String>, String> {
    let script =
        r#"POSIX path of (choose file with prompt "Choose a screenshot" of type {"public.image"})"#;
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Ok(None);
    }
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok((!path.is_empty()).then_some(path))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_image_extensions() {
        assert_eq!(extension_of(Path::new("/a/b.png")).unwrap(), "png");
        assert_eq!(extension_of(Path::new("/a/b.JPEG")).unwrap(), "jpeg");
        assert!(extension_of(Path::new("/a/b.pdf")).is_none());
        assert!(extension_of(Path::new("/a/b.sh")).is_none());
        assert!(extension_of(Path::new("/a/noext")).is_none());
    }

    #[test]
    fn rejects_unsupported_bytes_extension() {
        let result = import_screenshot_bytes(1, "desktop".into(), vec![1, 2, 3], "exe".into());
        assert!(result.is_err());
    }

    #[test]
    fn rejects_empty_pasted_image() {
        let result = import_screenshot_bytes(1, "desktop".into(), Vec::new(), "png".into());
        assert!(result.unwrap_err().contains("empty"));
    }
}
