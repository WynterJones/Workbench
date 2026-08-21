use crate::models::BrokenReason;
use regex::Regex;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader};
use std::net::{TcpListener, TcpStream, ToSocketAddrs};
use std::os::unix::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

const LOG_CAP: usize = 200;
const HEALTH_TIMEOUT: Duration = Duration::from_secs(45);
const KILL_GRACE: Duration = Duration::from_secs(3);

pub struct LogRing {
    lines: Mutex<VecDeque<String>>,
}

impl LogRing {
    pub fn new() -> Arc<Self> {
        Arc::new(LogRing {
            lines: Mutex::new(VecDeque::with_capacity(LOG_CAP)),
        })
    }

    pub fn push(&self, line: String) {
        let mut lines = self.lines.lock().unwrap();
        if lines.len() >= LOG_CAP {
            lines.pop_front();
        }
        lines.push_back(line);
    }

    pub fn tail(&self) -> String {
        self.lines
            .lock()
            .unwrap()
            .iter()
            .cloned()
            .collect::<Vec<_>>()
            .join("\n")
    }
}

pub struct RunningChild {
    pub child: Child,
    pub pid: i32,
    pub log: Arc<LogRing>,
    pub detected_url: Arc<Mutex<Option<String>>>,
}

#[derive(Default)]
pub struct ProcessRegistry(pub Mutex<std::collections::HashMap<i64, RunningChild>>);

fn url_regex() -> Regex {
    Regex::new(r#"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?[^\s"'<>]*"#).unwrap()
}

pub fn extract_url(text: &str) -> Option<String> {
    url_regex()
        .find(text)
        .map(|m| m.as_str().trim_end_matches(['/', '.', ',']).to_string())
}

pub fn find_free_port() -> Result<u16, String> {
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    drop(listener);
    Ok(port)
}

fn spawn_shell(cwd: &str, cmd: &str, port: u16) -> std::io::Result<Child> {
    let mut command = Command::new("/bin/sh");
    command
        .arg("-lc")
        .arg(cmd)
        .current_dir(cwd)
        .env("PORT", port.to_string())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    unsafe {
        command.pre_exec(|| {
            libc::setsid();
            Ok(())
        });
    }
    command.spawn()
}

pub fn spawn_run(cwd: &str, cmd: &str, port: u16) -> Result<RunningChild, String> {
    let mut child = spawn_shell(cwd, cmd, port).map_err(|e| e.to_string())?;
    let pid = child.id() as i32;
    let log = LogRing::new();
    let detected_url = Arc::new(Mutex::new(None));

    if let Some(stdout) = child.stdout.take() {
        spawn_reader(stdout, log.clone(), detected_url.clone());
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_reader(stderr, log.clone(), detected_url.clone());
    }

    Ok(RunningChild {
        child,
        pid,
        log,
        detected_url,
    })
}

fn spawn_reader<R: std::io::Read + Send + 'static>(
    reader: R,
    log: Arc<LogRing>,
    detected_url: Arc<Mutex<Option<String>>>,
) {
    thread::spawn(move || {
        let buffered = BufReader::new(reader);
        for line in buffered.lines() {
            let Ok(line) = line else { break };
            if let Some(url) = extract_url(&line) {
                let mut slot = detected_url.lock().unwrap();
                if slot.is_none() {
                    *slot = Some(url);
                }
            }
            log.push(line);
        }
    });
}

pub fn terminate(child: &mut Child, pid: i32) {
    unsafe {
        libc::kill(-pid, libc::SIGTERM);
    }
    let deadline = Instant::now() + KILL_GRACE;
    loop {
        match child.try_wait() {
            Ok(Some(_)) => return,
            Ok(None) => {
                if Instant::now() >= deadline {
                    break;
                }
                thread::sleep(Duration::from_millis(150));
            }
            Err(_) => break,
        }
    }
    unsafe {
        libc::kill(-pid, libc::SIGKILL);
    }
    let _ = child.wait();
}

fn parse_host_port(url: &str) -> Option<(String, u16)> {
    let without_scheme = url.split("://").nth(1)?;
    let host_port = without_scheme.split('/').next()?;
    let mut parts = host_port.split(':');
    let host = parts.next()?.to_string();
    let port = parts
        .next()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(80);
    Some((host, port))
}

pub fn wait_for_serving(url: &str, timeout: Duration) -> bool {
    let Some((host, port)) = parse_host_port(url) else {
        return false;
    };
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        if let Ok(mut addrs) = (host.as_str(), port).to_socket_addrs() {
            if let Some(addr) = addrs.next() {
                if TcpStream::connect_timeout(&addr, Duration::from_millis(500)).is_ok() {
                    return true;
                }
            }
        }
        thread::sleep(Duration::from_millis(300));
    }
    false
}

pub fn health_timeout() -> Duration {
    HEALTH_TIMEOUT
}

pub fn classify_precheck(
    run_cmd: Option<&str>,
    deps_installed: bool,
    has_env_example: bool,
    has_env_file: bool,
) -> Option<BrokenReason> {
    if run_cmd.map(|c| c.trim().is_empty()).unwrap_or(true) {
        return Some(BrokenReason::NoRunCommand);
    }
    if !deps_installed {
        return Some(BrokenReason::DepsNotInstalled);
    }
    if has_env_example && !has_env_file {
        return Some(BrokenReason::MissingEnv);
    }
    None
}

pub fn classify_postrun(exit_code: Option<i32>, timed_out: bool, log_tail: &str) -> BrokenReason {
    let lower = log_tail.to_lowercase();
    if lower.contains("eaddrinuse") || lower.contains("address already in use") {
        return BrokenReason::PortInUse;
    }
    if timed_out {
        return BrokenReason::Timeout;
    }
    match exit_code {
        Some(code) if code != 0 => BrokenReason::Crashed,
        _ => BrokenReason::Crashed,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_vite_url() {
        let line = "  ➜  Local:   http://localhost:5173/";
        assert_eq!(extract_url(line), Some("http://localhost:5173".to_string()));
    }

    #[test]
    fn extracts_next_url() {
        let line = "- Local:        http://localhost:3000";
        assert_eq!(extract_url(line), Some("http://localhost:3000".to_string()));
    }

    #[test]
    fn extracts_rails_puma_url() {
        let line = "* Listening on http://127.0.0.1:3000";
        assert_eq!(extract_url(line), Some("http://127.0.0.1:3000".to_string()));
    }

    #[test]
    fn ignores_non_local_urls() {
        let line = "Deploying to https://example.com";
        assert_eq!(extract_url(line), None);
    }

    #[test]
    fn no_run_command_wins_precheck() {
        assert_eq!(
            classify_precheck(None, true, false, false),
            Some(BrokenReason::NoRunCommand)
        );
        assert_eq!(
            classify_precheck(Some("  "), true, false, false),
            Some(BrokenReason::NoRunCommand)
        );
    }

    #[test]
    fn deps_not_installed_precheck() {
        assert_eq!(
            classify_precheck(Some("npm run dev"), false, false, false),
            Some(BrokenReason::DepsNotInstalled)
        );
    }

    #[test]
    fn missing_env_precheck() {
        assert_eq!(
            classify_precheck(Some("npm run dev"), true, true, false),
            Some(BrokenReason::MissingEnv)
        );
        assert_eq!(
            classify_precheck(Some("npm run dev"), true, true, true),
            None
        );
    }

    #[test]
    fn precheck_passes_when_healthy() {
        assert_eq!(
            classify_precheck(Some("npm run dev"), true, false, false),
            None
        );
    }

    #[test]
    fn postrun_detects_port_in_use() {
        let reason = classify_postrun(
            Some(1),
            false,
            "Error: listen EADDRINUSE: address already in use :::3000",
        );
        assert_eq!(reason, BrokenReason::PortInUse);
    }

    #[test]
    fn postrun_detects_timeout() {
        let reason = classify_postrun(None, true, "still booting...");
        assert_eq!(reason, BrokenReason::Timeout);
    }

    #[test]
    fn postrun_detects_crash() {
        let reason = classify_postrun(
            Some(1),
            false,
            "TypeError: cannot read property of undefined",
        );
        assert_eq!(reason, BrokenReason::Crashed);
    }

    #[test]
    fn log_ring_caps_at_200_lines() {
        let ring = LogRing::new();
        for i in 0..250 {
            ring.push(format!("line {i}"));
        }
        let tail = ring.tail();
        assert_eq!(tail.lines().count(), LOG_CAP);
        assert!(tail.starts_with("line 50"));
    }
}
