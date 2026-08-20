use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::RecvTimeoutError;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter};

const DEBOUNCE: Duration = Duration::from_millis(150);

struct ActiveWatcher {
    _watcher: RecommendedWatcher,
    stop: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct WatcherState(Mutex<Option<ActiveWatcher>>);

pub fn stop(state: &WatcherState) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(active) = guard.take() {
            active.stop.store(true, Ordering::Relaxed);
        }
    }
}

pub fn start(app: AppHandle, state: &WatcherState, dir_path: &str) -> Result<(), String> {
    stop(state);

    let (tx, rx) = std::sync::mpsc::channel::<notify::Result<Event>>();
    let mut watcher = notify::recommended_watcher(move |res| {
        let _ = tx.send(res);
    })
    .map_err(|e| e.to_string())?;
    watcher
        .watch(Path::new(dir_path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    let stop_flag = Arc::new(AtomicBool::new(false));
    let stop_flag_bg = stop_flag.clone();
    let watched_path = dir_path.to_string();

    thread::spawn(move || {
        let mut pending = false;
        loop {
            if stop_flag_bg.load(Ordering::Relaxed) {
                break;
            }
            match rx.recv_timeout(DEBOUNCE) {
                Ok(_) => pending = true,
                Err(RecvTimeoutError::Timeout) => {
                    if pending {
                        pending = false;
                        let _ = app.emit("fs:changed", watched_path.clone());
                    }
                }
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
    });

    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = Some(ActiveWatcher {
        _watcher: watcher,
        stop: stop_flag,
    });
    Ok(())
}
