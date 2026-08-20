use crate::models::{AiProvider, BrokenReason, Editor, ProjectStatus, Settings, Terminal};
use rusqlite::{Connection, OptionalExtension};
use std::path::PathBuf;

pub fn workbench_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".workbench")
}

pub fn db_path() -> PathBuf {
    workbench_dir().join("workbench.db")
}

pub fn open_conn() -> Result<Connection, String> {
    let conn = Connection::open(db_path()).map_err(|e| e.to_string())?;
    conn.busy_timeout(std::time::Duration::from_secs(5))
        .map_err(|e| e.to_string())?;
    Ok(conn)
}

pub struct ProjectRunInfo {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub run_cmd: Option<String>,
    pub trusted: bool,
    pub deps_installed: bool,
    pub has_env_example: bool,
    pub port: Option<i64>,
    pub framework: String,
    pub readme_summary: Option<String>,
    pub status: String,
    pub git_remote: Option<String>,
    pub run_url: Option<String>,
}

pub fn get_project_run_info(id: i64) -> Result<ProjectRunInfo, String> {
    let conn = open_conn()?;
    conn.query_row(
        "SELECT id, path, name, run_cmd, trusted, deps_installed, has_env_example, port,
                framework, readme_summary, status, git_remote, run_url
         FROM projects WHERE id = ?1",
        [id],
        |row| {
            Ok(ProjectRunInfo {
                id: row.get(0)?,
                path: row.get(1)?,
                name: row.get(2)?,
                run_cmd: row.get(3)?,
                trusted: row.get(4)?,
                deps_installed: row.get(5)?,
                has_env_example: row.get(6)?,
                port: row.get(7)?,
                framework: row.get(8)?,
                readme_summary: row.get(9)?,
                status: row.get(10)?,
                git_remote: row.get(11)?,
                run_url: row.get(12)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())?
    .ok_or_else(|| format!("project {id} not found"))
}

pub fn set_trusted(id: i64, trusted: bool) -> Result<(), String> {
    let conn = open_conn()?;
    conn.execute(
        "UPDATE projects SET trusted = ?1 WHERE id = ?2",
        rusqlite::params![trusted, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn update_after_run(
    id: i64,
    status: ProjectStatus,
    run_url: Option<&str>,
    port: Option<i64>,
    broken_reason: Option<BrokenReason>,
) -> Result<(), String> {
    let conn = open_conn()?;
    conn.execute(
        "UPDATE projects SET status = ?1, run_url = ?2, port = ?3, broken_reason = ?4 WHERE id = ?5",
        rusqlite::params![
            status.as_str(),
            run_url,
            port,
            broken_reason.map(|r| r.as_str()),
            id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn insert_screenshot(project_id: i64, variant: &str, file_path: &str) -> Result<(), String> {
    let conn = open_conn()?;
    conn.execute(
        "INSERT INTO screenshots (project_id, variant, file_path, captured_at)
         VALUES (?1, ?2, ?3, datetime('now'))",
        rusqlite::params![project_id, variant, file_path],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn list_trusted_project_ids() -> Result<Vec<i64>, String> {
    let conn = open_conn()?;
    let mut stmt = conn
        .prepare("SELECT id FROM projects WHERE trusted = 1 AND archived = 0")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?;
    let mut ids = Vec::new();
    for r in rows {
        ids.push(r.map_err(|e| e.to_string())?);
    }
    Ok(ids)
}

pub fn get_screenshot_path(project_id: i64, variant: &str) -> Option<String> {
    let conn = open_conn().ok()?;
    conn.query_row(
        "SELECT file_path FROM screenshots WHERE project_id = ?1 AND variant = ?2
         ORDER BY captured_at DESC LIMIT 1",
        rusqlite::params![project_id, variant],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .ok()
    .flatten()
}

pub fn get_settings() -> Settings {
    open_conn()
        .ok()
        .and_then(|conn| read_settings_row(&conn).ok().flatten())
        .unwrap_or_default()
}

fn read_settings_row(conn: &Connection) -> Result<Option<Settings>, String> {
    conn.query_row(
        "SELECT ai_provider, editor, terminal, auto_screenshot, concurrent_runs, intro_seen
         FROM settings WHERE id = 1",
        [],
        |row| {
            let ai_provider: String = row.get(0)?;
            let editor: String = row.get(1)?;
            let terminal: String = row.get(2)?;
            Ok(Settings {
                ai_provider: AiProvider::from_str(&ai_provider),
                editor: Editor::from_str(&editor),
                terminal: Terminal::from_str(&terminal),
                auto_screenshot: row.get(3)?,
                concurrent_runs: row.get(4)?,
                intro_seen: row.get(5)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}
