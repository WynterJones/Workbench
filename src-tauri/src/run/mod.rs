pub mod capture;
mod process;
pub mod store;

pub use process::ProcessRegistry;

use crate::models::{BrokenReason, ProjectStatus, RunResult};
use process::RunningChild;
use serde::Serialize;
use std::collections::VecDeque;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
pub struct CaptureCancel(AtomicBool);

fn has_env_file(project_path: &str) -> bool {
    Path::new(project_path).join(".env").exists()
}

enum RunOutcome {
    Ready(String),
    Exited(Option<i32>),
    TimedOut,
}

fn wait_for_outcome(
    id: i64,
    registry: &ProcessRegistry,
    detected_url: &Mutex<Option<String>>,
    deadline: Instant,
) -> RunOutcome {
    loop {
        if let Some(url) = detected_url.lock().unwrap().clone() {
            if process::wait_for_serving(&url, Duration::from_millis(600)) {
                return RunOutcome::Ready(url);
            }
        }
        {
            let mut map = registry.0.lock().unwrap();
            if let Some(rc) = map.get_mut(&id) {
                if let Ok(Some(status)) = rc.child.try_wait() {
                    return RunOutcome::Exited(status.code());
                }
            }
        }
        if Instant::now() >= deadline {
            return RunOutcome::TimedOut;
        }
        std::thread::sleep(Duration::from_millis(300));
    }
}

fn take_running(registry: &ProcessRegistry, id: i64) -> Option<RunningChild> {
    registry.0.lock().unwrap().remove(&id)
}

fn kill_and_remove(registry: &ProcessRegistry, id: i64) {
    if let Some(mut rc) = take_running(registry, id) {
        process::terminate(&mut rc.child, rc.pid);
    }
}

fn ensure_trusted(trusted: bool) -> Result<(), String> {
    if !trusted {
        return Err("project is not trusted; call trust_project first".to_string());
    }
    Ok(())
}

fn execute_run(id: i64, registry: &ProcessRegistry) -> Result<RunResult, String> {
    let info = store::get_project_run_info(id)?;
    ensure_trusted(info.trusted)?;

    if let Some(reason) = process::classify_precheck(
        info.run_cmd.as_deref(),
        info.deps_installed,
        info.has_env_example,
        has_env_file(&info.path),
    ) {
        store::update_after_run(id, ProjectStatus::Broken, None, None, Some(reason))?;
        return Ok(RunResult {
            project_id: id,
            url: None,
            ok: false,
            reason: Some(reason),
            log_tail: String::new(),
        });
    }

    let cmd = info.run_cmd.clone().unwrap();
    let port = process::find_free_port()?;
    let running = process::spawn_run(&info.path, &cmd, port)?;
    let log = running.log.clone();
    let detected_url = running.detected_url.clone();

    {
        let mut map = registry.0.lock().unwrap();
        map.insert(id, running);
    }

    let deadline = Instant::now() + process::health_timeout();
    let outcome = wait_for_outcome(id, registry, &detected_url, deadline);

    match outcome {
        RunOutcome::Ready(url) => {
            store::update_after_run(
                id,
                ProjectStatus::Running,
                Some(&url),
                Some(port as i64),
                None,
            )?;
            Ok(RunResult {
                project_id: id,
                url: Some(url),
                ok: true,
                reason: None,
                log_tail: log.tail(),
            })
        }
        RunOutcome::Exited(code) => {
            let tail = log.tail();
            kill_and_remove(registry, id);
            let reason = process::classify_postrun(code, false, &tail);
            store::update_after_run(id, ProjectStatus::Broken, None, None, Some(reason))?;
            Ok(RunResult {
                project_id: id,
                url: None,
                ok: false,
                reason: Some(reason),
                log_tail: tail,
            })
        }
        RunOutcome::TimedOut => {
            let tail = log.tail();
            kill_and_remove(registry, id);
            let reason = process::classify_postrun(None, true, &tail);
            store::update_after_run(id, ProjectStatus::Broken, None, None, Some(reason))?;
            Ok(RunResult {
                project_id: id,
                url: None,
                ok: false,
                reason: Some(reason),
                log_tail: tail,
            })
        }
    }
}

#[tauri::command]
pub fn trust_project(id: i64, trusted: bool) -> Result<(), String> {
    store::set_trusted(id, trusted)
}

#[tauri::command]
pub fn run_project(id: i64, registry: State<'_, ProcessRegistry>) -> Result<RunResult, String> {
    execute_run(id, &registry)
}

#[tauri::command]
pub fn stop_project(id: i64, registry: State<'_, ProcessRegistry>) -> Result<(), String> {
    kill_and_remove(&registry, id);
    store::update_after_run(id, ProjectStatus::Runnable, None, None, None)
}

#[derive(Serialize, Clone)]
struct CaptureProgress {
    #[serde(rename = "projectId")]
    project_id: i64,
    ok: bool,
    #[serde(rename = "brokenReason")]
    broken_reason: Option<BrokenReason>,
    remaining: usize,
    done: bool,
}

fn capture_shots(id: i64, url: &str) -> Result<(), String> {
    let chrome = capture::resolve_chrome_binary()
        .ok_or("Chrome is not installed, so Workbench cannot take screenshots")?;
    let mut saved = 0;
    for variant in [&capture::DESKTOP, &capture::MOBILE] {
        let out_path = capture::shot_path(id, variant.name);
        if capture::capture_screenshot(&chrome, url, variant, &out_path).is_ok()
            && !capture::is_blank_png(&out_path).unwrap_or(false)
        {
            store::insert_screenshot(id, variant.name, &out_path.to_string_lossy())?;
            saved += 1;
        }
    }
    if saved == 0 {
        return Err(format!(
            "{url} came back blank — try a screenshot tour, which drives the app first"
        ));
    }
    Ok(())
}

fn capture_one(id: i64, app: &AppHandle) -> Result<(), String> {
    let registry = app.state::<ProcessRegistry>();
    let result = execute_run(id, &registry)?;
    let outcome = match (&result.url, result.ok) {
        (Some(url), true) => capture_shots(id, url),
        _ => Err(format!(
            "the project did not start ({})",
            result
                .reason
                .map(|reason| reason.as_str())
                .unwrap_or("no reason given")
        )),
    };
    kill_and_remove(&registry, id);
    if result.ok {
        store::update_after_run(id, ProjectStatus::Runnable, None, None, None)?;
    }
    outcome
}

fn pop_next(queue: &Mutex<VecDeque<i64>>) -> Option<i64> {
    queue.lock().unwrap().pop_front()
}

#[tauri::command]
pub fn capture_project(app: AppHandle, project_id: i64) -> Result<(), String> {
    let cancel = app.state::<CaptureCancel>();
    cancel.0.store(false, Ordering::SeqCst);
    capture_one(project_id, &app)
}

#[tauri::command]
pub fn capture_all(app: AppHandle) -> Result<(), String> {
    let cancel = app.state::<CaptureCancel>();
    cancel.0.store(false, Ordering::SeqCst);

    let ids = store::list_trusted_project_ids()?;
    let queue = Mutex::new(ids.into_iter().collect::<VecDeque<_>>());
    let settings = store::get_settings();
    let concurrency = (settings.concurrent_runs.max(1) as usize).min(8);

    std::thread::scope(|scope| {
        for _ in 0..concurrency {
            let queue_ref: &Mutex<VecDeque<i64>> = &queue;
            let app_ref = app.clone();
            let cancel_ref = app.state::<CaptureCancel>();
            scope.spawn(move || {
                worker_loop(queue_ref, &app_ref, &cancel_ref);
            });
        }
    });

    Ok(())
}

fn worker_loop(queue: &Mutex<VecDeque<i64>>, app: &AppHandle, cancel: &CaptureCancel) {
    loop {
        if cancel.0.load(Ordering::SeqCst) {
            break;
        }
        let Some(id) = pop_next(queue) else {
            break;
        };
        let result = capture_one(id, app);
        let remaining = queue.lock().unwrap().len();
        let payload = CaptureProgress {
            project_id: id,
            ok: result.is_ok(),
            broken_reason: None,
            remaining,
            done: remaining == 0,
        };
        let _ = app.emit("capture:progress", payload);
    }
}

#[tauri::command]
pub fn capture_cancel(cancel: State<'_, CaptureCancel>) -> Result<(), String> {
    cancel.0.store(true, Ordering::SeqCst);
    Ok(())
}

pub fn kill_all_on_exit(registry: &ProcessRegistry) {
    let ids: Vec<i64> = {
        let map: MutexGuard<_> = registry.0.lock().unwrap();
        map.keys().copied().collect()
    };
    for id in ids {
        kill_and_remove(registry, id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn env_file_check_is_false_for_missing_dir() {
        assert!(!has_env_file("/nonexistent/workbench-test-path"));
    }

    #[test]
    fn trust_gate_rejects_untrusted_project() {
        assert!(ensure_trusted(false).is_err());
        assert!(ensure_trusted(true).is_ok());
    }
}
