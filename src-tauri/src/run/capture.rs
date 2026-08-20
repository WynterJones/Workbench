use crate::run::store::workbench_dir;
use std::collections::HashSet;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

const CHROME_CANDIDATES: [&str; 3] = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

const CAPTURE_TIMEOUT: Duration = Duration::from_secs(20);
const BLANK_SIZE_THRESHOLD: u64 = 3000;
const BLANK_UNIQUE_BYTE_THRESHOLD: usize = 12;

pub struct Variant {
    pub name: &'static str,
    pub width: u32,
    pub height: u32,
}

pub const DESKTOP: Variant = Variant {
    name: "desktop",
    width: 1440,
    height: 900,
};

pub const MOBILE: Variant = Variant {
    name: "mobile",
    width: 390,
    height: 844,
};

pub fn resolve_chrome_binary() -> Option<String> {
    for candidate in CHROME_CANDIDATES {
        if std::path::Path::new(candidate).exists() {
            return Some(candidate.to_string());
        }
    }
    which_binary("google-chrome-stable")
}

fn which_binary(name: &str) -> Option<String> {
    let output = Command::new("which").arg(name).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        None
    } else {
        Some(path)
    }
}

pub fn shots_dir() -> PathBuf {
    workbench_dir().join("shots")
}

pub fn shot_path(project_id: i64, variant: &str) -> PathBuf {
    shots_dir().join(format!("{project_id}-{variant}.png"))
}

pub fn capture_screenshot(
    chrome_bin: &str,
    url: &str,
    variant: &Variant,
    out_path: &std::path::Path,
) -> Result<(), String> {
    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let window_size = format!("{},{}", variant.width, variant.height);
    let screenshot_arg = format!("--screenshot={}", out_path.display());
    let mut child = Command::new(chrome_bin)
        .args([
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--virtual-time-budget=4000",
            &format!("--window-size={window_size}"),
            &screenshot_arg,
            url,
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;

    let deadline = Instant::now() + CAPTURE_TIMEOUT;
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => {
                if !status.success() {
                    return Err(format!("chrome exited with {status}"));
                }
                break;
            }
            None => {
                if Instant::now() >= deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err("chrome screenshot timed out".to_string());
                }
                std::thread::sleep(Duration::from_millis(150));
            }
        }
    }

    if !out_path.exists() {
        return Err("screenshot file was not created".to_string());
    }
    Ok(())
}

pub fn is_blank_png(path: &std::path::Path) -> Result<bool, String> {
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    if bytes.len() as u64 <= BLANK_SIZE_THRESHOLD {
        return Ok(true);
    }
    let sample_start = bytes.len() / 4;
    let sample_end = (bytes.len() * 3 / 4).min(bytes.len());
    let sample = &bytes[sample_start..sample_end];
    let unique: HashSet<u8> = sample.iter().copied().collect();
    Ok(unique.len() <= BLANK_UNIQUE_BYTE_THRESHOLD)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shot_path_matches_naming_convention() {
        let path = shot_path(42, "desktop");
        assert!(path.to_string_lossy().ends_with("42-desktop.png"));
    }

    #[test]
    fn small_file_is_blank() {
        let dir = std::env::temp_dir().join("workbench-capture-test-small");
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("tiny.png");
        std::fs::write(&file, vec![0u8; 100]).unwrap();
        assert!(is_blank_png(&file).unwrap());
    }

    #[test]
    fn low_diversity_file_is_blank() {
        let dir = std::env::temp_dir().join("workbench-capture-test-flat");
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("flat.png");
        std::fs::write(&file, vec![7u8; 10_000]).unwrap();
        assert!(is_blank_png(&file).unwrap());
    }

    #[test]
    fn high_diversity_file_is_not_blank() {
        let dir = std::env::temp_dir().join("workbench-capture-test-real");
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("real.png");
        let bytes: Vec<u8> = (0..10_000u32).map(|i| (i % 256) as u8).collect();
        std::fs::write(&file, bytes).unwrap();
        assert!(!is_blank_png(&file).unwrap());
    }
}
