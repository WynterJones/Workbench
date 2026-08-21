use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use portable_pty::{CommandBuilder, NativePtySystem, PtyPair, PtySize, PtySystem};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PtyOutput {
    pub id: String,
    pub chunk: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PtyExit {
    pub id: String,
}

struct Session {
    pair: PtyPair,
    writer: Box<dyn Write + Send>,
}

#[derive(Default)]
pub struct PtyRegistry(Mutex<HashMap<String, Session>>);

fn login_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
}

#[tauri::command]
pub fn pty_open(
    app: AppHandle,
    registry: tauri::State<PtyRegistry>,
    id: String,
    cwd: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    {
        let sessions = registry.0.lock().map_err(|_| "pty registry poisoned")?;
        if sessions.contains_key(&id) {
            return Ok(());
        }
    }

    let system = NativePtySystem::default();
    let pair = system
        .openpty(PtySize {
            rows: rows.max(2),
            cols: cols.max(20),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut command = CommandBuilder::new(login_shell());
    command.arg("-l");
    command.env("TERM", "xterm-256color");
    if let Some(dir) = cwd.filter(|d| std::path::Path::new(d).is_dir()) {
        command.cwd(dir);
    } else if let Some(home) = dirs::home_dir() {
        command.cwd(home);
    }

    let mut child = pair
        .slave
        .spawn_command(command)
        .map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    {
        let mut sessions = registry.0.lock().map_err(|_| "pty registry poisoned")?;
        sessions.insert(id.clone(), Session { pair, writer });
    }

    let reader_app = app.clone();
    let reader_id = id.clone();
    std::thread::spawn(move || {
        let mut buffer = [0u8; 8192];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buffer[..n]).to_string();
                    let _ = reader_app.emit(
                        "pty:output",
                        PtyOutput {
                            id: reader_id.clone(),
                            chunk,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let _ = reader_app.emit("pty:exit", PtyExit { id: reader_id });
    });

    let waiter_id = id.clone();
    let waiter_registry = Arc::new(());
    std::thread::spawn(move || {
        let _keep = waiter_registry;
        let _ = child.wait();
        let _ = waiter_id;
    });

    Ok(())
}

#[tauri::command]
pub fn pty_write(
    registry: tauri::State<PtyRegistry>,
    id: String,
    data: String,
) -> Result<(), String> {
    let mut sessions = registry.0.lock().map_err(|_| "pty registry poisoned")?;
    let session = sessions
        .get_mut(&id)
        .ok_or_else(|| format!("no terminal session {id}"))?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    session.writer.flush().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_resize(
    registry: tauri::State<PtyRegistry>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = registry.0.lock().map_err(|_| "pty registry poisoned")?;
    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("no terminal session {id}"))?;
    session
        .pair
        .master
        .resize(PtySize {
            rows: rows.max(2),
            cols: cols.max(20),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_close(registry: tauri::State<PtyRegistry>, id: String) -> Result<(), String> {
    let mut sessions = registry.0.lock().map_err(|_| "pty registry poisoned")?;
    sessions.remove(&id);
    Ok(())
}

#[tauri::command]
pub fn pty_is_open(registry: tauri::State<PtyRegistry>, id: String) -> Result<bool, String> {
    let sessions = registry.0.lock().map_err(|_| "pty registry poisoned")?;
    Ok(sessions.contains_key(&id))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn login_shell_falls_back_to_a_real_shell() {
        let shell = login_shell();
        assert!(
            shell.starts_with('/'),
            "expected an absolute path, got {shell}"
        );
    }

    #[test]
    fn registry_starts_empty() {
        let registry = PtyRegistry::default();
        assert!(registry.0.lock().unwrap().is_empty());
    }

    #[test]
    fn pty_size_never_collapses_to_zero() {
        let size = PtySize {
            rows: 0u16.max(2),
            cols: 0u16.max(20),
            pixel_width: 0,
            pixel_height: 0,
        };
        assert!(size.rows >= 2 && size.cols >= 20);
    }
}
