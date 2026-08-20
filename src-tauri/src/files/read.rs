use std::fs;
use std::io::Read;
use std::path::PathBuf;

use serde::Serialize;

use super::fs_ops::guard_existing;

const DEFAULT_MAX_BYTES: u64 = 2 * 1024 * 1024;
const SNIFF_BYTES: usize = 8192;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContents {
    pub kind: String,
    pub text: Option<String>,
    pub size_bytes: u64,
    pub truncated: bool,
}

fn looks_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(SNIFF_BYTES).any(|b| *b == 0)
}

pub fn read_file(path: &str, roots: &[PathBuf], max_bytes: Option<u64>) -> Result<FileContents, String> {
    let resolved = guard_existing(path, roots)?;
    let meta = fs::metadata(&resolved).map_err(|e| e.to_string())?;
    if meta.is_dir() {
        return Err("path is a directory".into());
    }

    let size = meta.len();
    let cap = max_bytes.unwrap_or(DEFAULT_MAX_BYTES);

    let mut file = fs::File::open(&resolved).map_err(|e| e.to_string())?;
    let mut buffer = Vec::with_capacity(cap.min(size) as usize);
    file.by_ref()
        .take(cap)
        .read_to_end(&mut buffer)
        .map_err(|e| e.to_string())?;

    if looks_binary(&buffer) {
        return Ok(FileContents {
            kind: "binary".into(),
            text: None,
            size_bytes: size,
            truncated: false,
        });
    }

    match String::from_utf8(buffer) {
        Ok(text) => Ok(FileContents {
            kind: "text".into(),
            text: Some(text),
            size_bytes: size,
            truncated: size > cap,
        }),
        Err(_) => Ok(FileContents {
            kind: "binary".into(),
            text: None,
            size_bytes: size,
            truncated: false,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn tmp_root(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("wb_read_tests_{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        fs::canonicalize(&dir).unwrap()
    }

    #[test]
    fn reads_text_and_flags_truncation() {
        let root = tmp_root("text");
        let file = root.join("a.txt");
        fs::write(&file, "hello world").unwrap();

        let full = read_file(file.to_str().unwrap(), &[root.clone()], None).unwrap();
        assert_eq!(full.kind, "text");
        assert_eq!(full.text.unwrap(), "hello world");
        assert!(!full.truncated);

        let clipped = read_file(file.to_str().unwrap(), &[root], Some(5)).unwrap();
        assert_eq!(clipped.text.unwrap(), "hello");
        assert!(clipped.truncated);
    }

    #[test]
    fn detects_binary_by_null_bytes() {
        let root = tmp_root("binary");
        let file = root.join("b.bin");
        let mut handle = fs::File::create(&file).unwrap();
        handle.write_all(&[0x89, 0x50, 0x00, 0x4e, 0x47]).unwrap();

        let result = read_file(file.to_str().unwrap(), &[root], None).unwrap();
        assert_eq!(result.kind, "binary");
        assert!(result.text.is_none());
    }

    #[test]
    fn rejects_paths_outside_allowed_roots() {
        let root = tmp_root("guard");
        assert!(read_file("/etc/hosts", &[root], None).is_err());
    }
}
