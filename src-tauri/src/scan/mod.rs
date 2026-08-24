pub mod detect;
pub mod git;
pub mod meta;
pub mod walker;

use std::fs;
use std::path::{Path, PathBuf};

use regex::Regex;
use rusqlite::Connection;
use tauri::{AppHandle, Emitter};

use crate::db;
use crate::models::{
    NewProjectInput, Project, ProjectPatch, ProjectStatus, ScanProgress, ShipScore,
};
use crate::score;

const MAX_TODO_FILES: usize = 5_000;
const MAX_TODOS: usize = 20;

pub fn run_scan(app: &AppHandle, roots: &[String]) -> Result<(), String> {
    let conn = db::open()?;
    let mut scanned = 0i64;
    let mut found = 0i64;
    let scanned_roots: Vec<PathBuf> = roots
        .iter()
        .map(PathBuf::from)
        .filter(|root| root.is_dir())
        .collect();

    for root_path in &scanned_roots {
        for project_dir in walker::find_project_dirs(root_path) {
            scanned += 1;
            let _ = app.emit(
                "scan:progress",
                ScanProgress {
                    scanned,
                    found,
                    current_path: project_dir.display().to_string(),
                    done: false,
                },
            );

            if let Some(input) = scan_one(&project_dir) {
                if let Ok(project) = db::upsert_project(&conn, &input) {
                    found += 1;
                    compute_and_persist_ship_score(&conn, &project);
                }
            }
        }
    }

    remove_missing_projects(&conn, &scanned_roots);

    let _ = app.emit(
        "scan:progress",
        ScanProgress {
            scanned,
            found,
            current_path: String::new(),
            done: true,
        },
    );

    Ok(())
}

#[tauri::command]
pub async fn start_scan(app: AppHandle, roots: Option<Vec<String>>) -> Result<(), String> {
    let roots = match roots {
        Some(r) if !r.is_empty() => r,
        _ => {
            let conn = crate::db::open()?;
            crate::db::list_roots(&conn)
                .map_err(|e| e.to_string())?
                .into_iter()
                .filter(|r| r.enabled)
                .map(|r| r.path)
                .collect()
        }
    };
    if roots.is_empty() {
        return Err("No scan roots configured. Add a folder in Settings first.".into());
    }
    let handle = tauri::async_runtime::spawn_blocking(move || run_scan(&app, &roots));
    match handle.await {
        Ok(result) => result,
        Err(e) => Err(e.to_string()),
    }
}

fn scan_one(dir: &Path) -> Option<NewProjectInput> {
    let entries = walker::list_entries(dir);
    let package_json = read_package_json(dir).map(|(info, _)| info);
    let ctx = detect::DetectContext {
        manifest_version_present: manifest_has_version(dir),
        wordpress_header_present: wordpress_header_present(dir),
        package_json,
    };
    let detection = detect::detect(dir, &entries, &ctx)?;

    let git_info = git::inspect(dir);
    let source_scan = meta::scan_source(dir);
    let last_modified =
        meta::to_rfc3339(meta::last_modified_or_dir(dir, source_scan.last_modified));

    let name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| dir.display().to_string());

    let deps_installed = meta::deps_installed(dir);
    let status = ProjectStatus::Unknown;

    Some(NewProjectInput {
        homepage: None,
        path: dir.display().to_string(),
        name,
        framework: detection.framework,
        language: detection.language,
        package_manager: detection.package_manager,
        last_modified,
        git_branch: git_info.branch,
        git_remote: git_info.remote,
        git_dirty: git_info.dirty,
        last_commit_at: git_info.last_commit_at,
        loc: source_scan.loc,
        readme_summary: meta::readme_summary(dir),
        run_cmd: detection.run_cmd,
        run_url: detection.run_url,
        port: detection.port,
        status,
        deps_installed,
        has_env_example: meta::has_env_example(dir),
    })
}

fn read_package_json(dir: &Path) -> Option<(detect::PackageJsonInfo, Vec<String>)> {
    let content = fs::read_to_string(dir.join("package.json")).ok()?;
    let value: serde_json::Value = serde_json::from_str(&content).ok()?;

    let scripts = value
        .get("scripts")
        .and_then(|s| s.as_object())
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                .collect()
        })
        .unwrap_or_default();

    let mut dependencies = Vec::new();
    for key in ["dependencies", "devDependencies"] {
        if let Some(obj) = value.get(key).and_then(|d| d.as_object()) {
            dependencies.extend(obj.keys().cloned());
        }
    }

    Some((detect::PackageJsonInfo { scripts }, dependencies))
}

fn manifest_has_version(dir: &Path) -> bool {
    fs::read_to_string(dir.join("manifest.json"))
        .ok()
        .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
        .map(|v| v.get("manifest_version").is_some())
        .unwrap_or(false)
}

fn wordpress_header_present(dir: &Path) -> bool {
    fs::read_to_string(dir.join("style.css"))
        .map(|c| c.contains("Plugin Name:") || c.contains("Theme Name:"))
        .unwrap_or(false)
}

fn blank_patch_with_score(score: i64) -> ProjectPatch {
    ProjectPatch {
        path: None,
        name: None,
        framework: None,
        language: None,
        package_manager: None,
        last_modified: None,
        git_branch: None,
        git_remote: None,
        git_dirty: None,
        last_commit_at: None,
        loc: None,
        readme_summary: None,
        run_cmd: None,
        run_url: None,
        homepage: None,
        port: None,
        status: None,
        broken_reason: None,
        trusted: None,
        archived: None,
        ship_score: Some(Some(score)),
        deps_installed: None,
        has_env_example: None,
    }
}

fn has_tests(dir: &Path, root_files: &[String]) -> bool {
    const TEST_MARKERS: &[&str] = &[
        "tests",
        "test",
        "__tests__",
        "spec",
        "cypress",
        "e2e",
        "vitest.config.ts",
        "vitest.config.js",
        "jest.config.js",
        "jest.config.ts",
        "playwright.config.ts",
        "pytest.ini",
        "phpunit.xml",
    ];
    root_files
        .iter()
        .any(|f| TEST_MARKERS.contains(&f.as_str()))
        || dir.join("src-tauri/tests").exists()
        || contains_test_files(dir)
}

fn is_test_file(name: &str) -> bool {
    name.contains(".test.")
        || name.contains(".spec.")
        || name.starts_with("test_")
        || name.ends_with("_test.go")
        || name.ends_with("_test.rs")
        || name.ends_with("_test.py")
        || name == "conftest.py"
}

fn contains_test_files(dir: &Path) -> bool {
    let mut rust_files_read = 0;
    for entry in ignore::WalkBuilder::new(dir)
        .max_depth(Some(5))
        .build()
        .flatten()
        .take(3000)
    {
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if is_test_file(&name) {
            return true;
        }
        if name.ends_with(".rs") && rust_files_read < 60 {
            rust_files_read += 1;
            if fs::read_to_string(entry.path())
                .map(|body| body.contains("#[cfg(test)]"))
                .unwrap_or(false)
            {
                return true;
            }
        }
    }
    false
}

fn manifest_text(dir: &Path) -> String {
    const MANIFESTS: &[&str] = &[
        "package.json",
        "Cargo.toml",
        "requirements.txt",
        "pyproject.toml",
        "Pipfile",
        "go.mod",
        "Gemfile",
        "composer.json",
        "pubspec.yaml",
        "mix.exs",
    ];
    MANIFESTS
        .iter()
        .filter_map(|name| fs::read_to_string(dir.join(name)).ok())
        .collect::<Vec<_>>()
        .join("\n")
}

fn is_recent(last_modified: &str) -> bool {
    match chrono::DateTime::parse_from_rfc3339(last_modified) {
        Ok(dt) => {
            let now = chrono::Utc::now();
            (now - dt.with_timezone(&chrono::Utc)).num_days() <= 30
        }
        Err(_) => false,
    }
}

fn compute_and_persist_ship_score(conn: &Connection, project: &Project) -> ShipScore {
    let dir = Path::new(&project.path);
    let manifests = manifest_text(dir);
    let root_files = walker::list_entries(dir);
    let has_screenshot =
        project.screenshot_desktop.is_some() || project.screenshot_mobile.is_some();

    let signals = score::ShipSignals {
        runs: project.run_cmd.is_some(),
        has_readme: project.readme_summary.is_some(),
        has_ui: score::detect_ui(project.framework, &root_files, has_screenshot),
        has_auth: score::detect_auth(&manifests),
        has_payments: score::detect_payments(&manifests),
        has_deployment: score::detect_deployment(&root_files),
        has_domain: score::detect_domain(&root_files, project.homepage.as_deref()),
        recently_maintained: is_recent(&project.last_modified),
        has_tests: has_tests(dir, &root_files),
    };

    let result = score::compute(signals);
    let _ = db::update_project(conn, project.id, &blank_patch_with_score(result.score));
    result
}

#[tauri::command]
pub fn ship_score(project_id: i64) -> Result<ShipScore, String> {
    let conn = db::open()?;
    let project = db::get_project(&conn, project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("project {project_id} not found"))?;

    Ok(compute_and_persist_ship_score(&conn, &project))
}

#[tauri::command]
pub fn project_todos(project_id: i64) -> Result<Vec<String>, String> {
    let conn = db::open()?;
    let project = db::get_project(&conn, project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("project {project_id} not found"))?;

    Ok(find_todos(Path::new(&project.path)))
}

fn find_todos(dir: &Path) -> Vec<String> {
    let pattern = Regex::new(r"(?i)\b(TODO|FIXME|HACK)\b[:\s]*(.*)").unwrap();
    let mut results = Vec::new();
    let mut visited = 0usize;
    walk_for_todos(dir, dir, &pattern, &mut results, &mut visited);
    results
}

fn walk_for_todos(
    root: &Path,
    dir: &Path,
    pattern: &Regex,
    results: &mut Vec<String>,
    visited: &mut usize,
) {
    if results.len() >= MAX_TODOS || *visited >= MAX_TODO_FILES {
        return;
    }
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        if results.len() >= MAX_TODOS || *visited >= MAX_TODO_FILES {
            return;
        }

        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };
        if file_type.is_symlink() {
            continue;
        }

        let path = entry.path();
        let name = entry.file_name();
        let name = name.to_string_lossy();

        if file_type.is_dir() {
            if walker::IGNORED_DIRS.contains(&name.as_ref()) {
                continue;
            }
            walk_for_todos(root, &path, pattern, results, visited);
            continue;
        }

        *visited += 1;
        let Ok(content) = fs::read_to_string(&path) else {
            continue;
        };

        for (idx, line) in content.lines().enumerate() {
            if let Some(caps) = pattern.captures(line) {
                let relative = path.strip_prefix(root).unwrap_or(&path).display();
                let text = caps
                    .get(0)
                    .map(|m| m.as_str().trim())
                    .unwrap_or("")
                    .to_string();
                results.push(format!("{relative}:{} — {text}", idx + 1));
                if results.len() >= MAX_TODOS {
                    return;
                }
            }
        }
    }
}

fn remove_missing_projects(conn: &rusqlite::Connection, roots: &[PathBuf]) -> usize {
    let paths: Vec<(i64, String)> =
        match conn
            .prepare("SELECT id, path FROM projects")
            .and_then(|mut stmt| {
                stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
                    .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())
            }) {
            Ok(rows) => rows,
            Err(_) => return 0,
        };

    let mut removed = 0;
    for (id, path) in paths {
        let path = Path::new(&path);
        if roots.iter().any(|root| path.starts_with(root))
            && !path.is_dir()
            && db::delete_project(conn, id).is_ok()
        {
            removed += 1;
        }
    }
    removed
}

#[cfg(test)]
mod missing_tests {
    use super::*;

    #[test]
    fn removes_only_missing_projects_under_scanned_roots() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::run_migrations(&conn).unwrap();

        let root = tempfile::tempdir().unwrap();
        let alive = root.path().join("alive");
        std::fs::create_dir(&alive).unwrap();
        let gone = root.path().join("gone");
        conn.execute(
            "INSERT INTO projects (path, name, framework, package_manager, status, first_seen, last_scanned, last_modified) \
             VALUES (?1, 'Alive', 'node', 'npm', 'runnable', '2026-01-01', '2026-01-01', '2026-01-01')",
            rusqlite::params![alive.to_string_lossy()],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO projects (path, name, framework, package_manager, status, first_seen, last_scanned, last_modified) \
             VALUES (?1, 'Gone', 'node', 'npm', 'runnable', '2026-01-01', '2026-01-01', '2026-01-01')",
            rusqlite::params![gone.to_string_lossy()],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO projects (path, name, framework, package_manager, status, first_seen, last_scanned, last_modified) \
             VALUES ('/outside/gone', 'Outside', 'node', 'npm', 'runnable', '2026-01-01', '2026-01-01', '2026-01-01')",
            [],
        )
        .unwrap();

        assert_eq!(
            remove_missing_projects(&conn, &[root.path().to_path_buf()]),
            1
        );

        let remaining: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM projects WHERE name IN ('Alive', 'Outside')",
                [],
                |r| r.get(0),
            )
            .unwrap();
        let gone: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM projects WHERE name = 'Gone'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(remaining, 2);
        assert_eq!(gone, 0);
    }
}
