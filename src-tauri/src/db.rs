use std::sync::Mutex;

use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row};

use crate::models::{
    ActivityEvent, ActivityKind, BrokenReason, Framework, LibraryStats, NewProjectInput,
    PackageManager, Project, ProjectPatch, ProjectQuery, ProjectStatus, ScanRoot, ShelfId,
    SortMode,
};

pub struct DbState(pub Mutex<Connection>);

const PROJECT_ICON_CANDIDATES: &[&str] = &[
    "favicon.ico",
    "favicon.png",
    "public/favicon.ico",
    "public/favicon.png",
    "app/favicon.ico",
    "src/app/favicon.ico",
    "public/icon.png",
    "public/logo.svg",
    "public/logo.png",
    "src/assets/icon.svg",
    "src/assets/icon.png",
    "src/assets/logo.svg",
    "src/assets/logo.png",
    "src-tauri/icons/128x128.png",
    "icons/icon128.png",
    "icon.png",
    "logo.png",
];

// ponytail: fixed candidates keep icon discovery cheap; persist paths if library loading becomes measurable.
fn project_icon(path: &str) -> Option<String> {
    PROJECT_ICON_CANDIDATES
        .iter()
        .map(|candidate| std::path::Path::new(path).join(candidate))
        .find(|candidate| candidate.is_file())
        .map(|candidate| candidate.to_string_lossy().to_string())
}

const MIGRATIONS: &[&str] = &[
    r#"
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    framework TEXT NOT NULL,
    language TEXT,
    package_manager TEXT NOT NULL,
    last_modified TEXT NOT NULL,
    git_branch TEXT,
    git_remote TEXT,
    git_dirty INTEGER NOT NULL DEFAULT 0,
    last_commit_at TEXT,
    loc INTEGER NOT NULL DEFAULT 0,
    readme_summary TEXT,
    run_cmd TEXT,
    run_url TEXT,
    port INTEGER,
    status TEXT NOT NULL DEFAULT 'unknown',
    broken_reason TEXT,
    trusted INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    ship_score INTEGER,
    deps_installed INTEGER NOT NULL DEFAULT 0,
    has_env_example INTEGER NOT NULL DEFAULT 0,
    first_seen TEXT NOT NULL,
    last_scanned TEXT NOT NULL
);

CREATE TABLE scan_roots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_scanned TEXT
);

CREATE TABLE screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    variant TEXT NOT NULL CHECK (variant IN ('desktop', 'mobile')),
    file_path TEXT NOT NULL,
    captured_at TEXT NOT NULL
);

CREATE INDEX idx_screenshots_project ON screenshots(project_id);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    UNIQUE(project_id, label)
);

CREATE INDEX idx_tags_project ON tags(project_id);

CREATE TABLE activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    detail TEXT
);

CREATE INDEX idx_activity_project ON activity(project_id);

CREATE TABLE run_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL,
    exit_code INTEGER,
    stdout_tail TEXT,
    outcome TEXT NOT NULL
);

CREATE INDEX idx_run_log_project ON run_log(project_id);

CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    ai_provider TEXT NOT NULL DEFAULT 'claude-code',
    editor TEXT NOT NULL DEFAULT 'vscode',
    terminal TEXT NOT NULL DEFAULT 'terminal',
    auto_screenshot INTEGER NOT NULL DEFAULT 1,
    concurrent_runs INTEGER NOT NULL DEFAULT 2,
    intro_seen INTEGER NOT NULL DEFAULT 0
);
"#,
    r#"
ALTER TABLE projects ADD COLUMN homepage TEXT;
"#,
    r#"
CREATE TABLE plugins (
    id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    selected TEXT NOT NULL DEFAULT '[]'
);
"#,
    r#"
ALTER TABLE plugins ADD COLUMN has_credential INTEGER NOT NULL DEFAULT 0;
UPDATE plugins SET has_credential = 1 WHERE enabled = 1 OR selected != '[]';
"#,
    r#"
DELETE FROM projects WHERE path LIKE '%/gems/%' OR path LIKE '%/gems';
"#,
    r#"
DELETE FROM projects WHERE path GLOB '*/.*';
"#,
    r#"
UPDATE projects SET status = 'unknown' WHERE status IN ('runnable', 'running');
"#,
];

pub fn db_path() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or("could not resolve home directory")?;
    let dir = home.join(".workbench");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("workbench.db"))
}

pub fn open() -> Result<Connection, String> {
    let path = db_path()?;
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    configure_connection(&conn).map_err(|e| e.to_string())?;
    run_migrations(&conn).map_err(|e| e.to_string())?;
    Ok(conn)
}

fn configure_connection(conn: &Connection) -> rusqlite::Result<()> {
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    Ok(())
}

pub fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    conn.pragma_update(None, "foreign_keys", "ON")?;
    let current: i64 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
    let current = current as usize;
    for (i, migration) in MIGRATIONS.iter().enumerate() {
        if i < current {
            continue;
        }
        conn.execute_batch(migration)?;
        conn.pragma_update(None, "user_version", (i + 1) as i64)?;
    }
    Ok(())
}

fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn tags_for_project(conn: &Connection, project_id: i64) -> rusqlite::Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT label FROM tags WHERE project_id = ?1 ORDER BY label")?;
    let rows = stmt.query_map(params![project_id], |row| row.get::<_, String>(0))?;
    rows.collect()
}

fn screenshot_for_variant(
    conn: &Connection,
    project_id: i64,
    variant: &str,
) -> rusqlite::Result<Option<String>> {
    conn.query_row(
        "SELECT file_path FROM screenshots WHERE project_id = ?1 AND variant = ?2 ORDER BY captured_at DESC LIMIT 1",
        params![project_id, variant],
        |row| row.get(0),
    )
    .optional()
}

fn project_core_from_row(row: &Row) -> rusqlite::Result<Project> {
    let path: String = row.get("path")?;
    let framework: String = row.get("framework")?;
    let package_manager: String = row.get("package_manager")?;
    let status: String = row.get("status")?;
    let broken_reason: Option<String> = row.get("broken_reason")?;

    Ok(Project {
        id: row.get("id")?,
        path: path.clone(),
        name: row.get("name")?,
        framework: Framework::from_str(&framework),
        language: row.get("language")?,
        package_manager: PackageManager::from_str(&package_manager),
        last_modified: row.get("last_modified")?,
        git_branch: row.get("git_branch")?,
        git_remote: row.get("git_remote")?,
        git_dirty: row.get::<_, i64>("git_dirty")? != 0,
        last_commit_at: row.get("last_commit_at")?,
        loc: row.get("loc")?,
        readme_summary: row.get("readme_summary")?,
        run_cmd: row.get("run_cmd")?,
        run_url: row.get("run_url")?,
        homepage: row.get("homepage")?,
        icon_path: project_icon(&path),
        port: row.get("port")?,
        status: ProjectStatus::from_str(&status),
        broken_reason: broken_reason.and_then(|s| BrokenReason::from_str(&s)),
        trusted: row.get::<_, i64>("trusted")? != 0,
        archived: row.get::<_, i64>("archived")? != 0,
        ship_score: row.get("ship_score")?,
        deps_installed: row.get::<_, i64>("deps_installed")? != 0,
        has_env_example: row.get::<_, i64>("has_env_example")? != 0,
        first_seen: row.get("first_seen")?,
        last_scanned: row.get("last_scanned")?,
        tags: Vec::new(),
        screenshot_desktop: None,
        screenshot_mobile: None,
    })
}

fn hydrate_project(conn: &Connection, mut project: Project) -> rusqlite::Result<Project> {
    project.tags = tags_for_project(conn, project.id)?;
    project.screenshot_desktop = screenshot_for_variant(conn, project.id, "desktop")?;
    project.screenshot_mobile = screenshot_for_variant(conn, project.id, "mobile")?;
    Ok(project)
}

pub fn get_project(conn: &Connection, id: i64) -> rusqlite::Result<Option<Project>> {
    let project = conn
        .query_row("SELECT * FROM projects WHERE id = ?1", params![id], |row| {
            project_core_from_row(row)
        })
        .optional()?;
    match project {
        Some(p) => Ok(Some(hydrate_project(conn, p)?)),
        None => Ok(None),
    }
}

fn get_project_by_path(conn: &Connection, path: &str) -> rusqlite::Result<Option<Project>> {
    conn.query_row(
        "SELECT * FROM projects WHERE path = ?1",
        params![path],
        |row| project_core_from_row(row),
    )
    .optional()
}

pub fn upsert_project(conn: &Connection, input: &NewProjectInput) -> rusqlite::Result<Project> {
    let existing = get_project_by_path(conn, &input.path)?;
    let timestamp = now();

    let id = match &existing {
        Some(existing) => {
            conn.execute(
                "UPDATE projects SET
                    name = ?1, framework = ?2, language = ?3, package_manager = ?4,
                    last_modified = ?5, git_branch = ?6, git_remote = ?7, git_dirty = ?8,
                    last_commit_at = ?9, loc = ?10, readme_summary = ?11, run_cmd = ?12,
                    run_url = ?13, port = ?14, deps_installed = ?15,
                    has_env_example = ?16, last_scanned = ?17
                 WHERE id = ?18",
                params![
                    input.name,
                    input.framework.as_str(),
                    input.language,
                    input.package_manager.as_str(),
                    input.last_modified,
                    input.git_branch,
                    input.git_remote,
                    input.git_dirty as i64,
                    input.last_commit_at,
                    input.loc,
                    input.readme_summary,
                    input.run_cmd,
                    input.run_url,
                    input.port,
                    input.deps_installed as i64,
                    input.has_env_example as i64,
                    timestamp,
                    existing.id,
                ],
            )?;
            insert_activity(conn, existing.id, ActivityKind::Scanned, None, None)?;
            existing.id
        }
        None => {
            conn.execute(
                "INSERT INTO projects (
                    path, name, framework, language, package_manager, last_modified,
                    git_branch, git_remote, git_dirty, last_commit_at, loc, readme_summary,
                    run_cmd, run_url, port, status, deps_installed, has_env_example,
                    first_seen, last_scanned
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
                params![
                    input.path,
                    input.name,
                    input.framework.as_str(),
                    input.language,
                    input.package_manager.as_str(),
                    input.last_modified,
                    input.git_branch,
                    input.git_remote,
                    input.git_dirty as i64,
                    input.last_commit_at,
                    input.loc,
                    input.readme_summary,
                    input.run_cmd,
                    input.run_url,
                    input.port,
                    input.status.as_str(),
                    input.deps_installed as i64,
                    input.has_env_example as i64,
                    timestamp,
                    timestamp,
                ],
            )?;
            let id = conn.last_insert_rowid();
            insert_activity(conn, id, ActivityKind::Created, None, None)?;
            id
        }
    };

    let project = get_project(conn, id)?.expect("project just upserted must exist");
    Ok(project)
}

pub fn update_project(
    conn: &Connection,
    id: i64,
    patch: &ProjectPatch,
) -> rusqlite::Result<Option<Project>> {
    if get_project(conn, id)?.is_none() {
        return Ok(None);
    }

    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    macro_rules! set_field {
        ($col:literal, $val:expr) => {
            sets.push(format!("{} = ?{}", $col, sets.len() + 1));
            values.push(Box::new($val));
        };
    }

    if let Some(v) = &patch.path {
        set_field!("path", v.clone());
    }
    if let Some(v) = &patch.name {
        set_field!("name", v.clone());
    }
    if let Some(v) = &patch.framework {
        set_field!("framework", v.as_str().to_string());
    }
    if let Some(v) = &patch.language {
        set_field!("language", v.clone());
    }
    if let Some(v) = &patch.package_manager {
        set_field!("package_manager", v.as_str().to_string());
    }
    if let Some(v) = &patch.last_modified {
        set_field!("last_modified", v.clone());
    }
    if let Some(v) = &patch.git_branch {
        set_field!("git_branch", v.clone());
    }
    if let Some(v) = &patch.git_remote {
        set_field!("git_remote", v.clone());
    }
    if let Some(v) = patch.git_dirty {
        set_field!("git_dirty", v as i64);
    }
    if let Some(v) = &patch.last_commit_at {
        set_field!("last_commit_at", v.clone());
    }
    if let Some(v) = patch.loc {
        set_field!("loc", v);
    }
    if let Some(v) = &patch.readme_summary {
        set_field!("readme_summary", v.clone());
    }
    if let Some(v) = &patch.run_cmd {
        set_field!("run_cmd", v.clone());
    }
    if let Some(v) = &patch.run_url {
        set_field!("run_url", v.clone());
    }
    if let Some(v) = &patch.homepage {
        set_field!("homepage", v.clone());
    }
    if let Some(v) = patch.port {
        set_field!("port", v);
    }
    if let Some(v) = &patch.status {
        set_field!("status", v.as_str().to_string());
    }
    if let Some(v) = &patch.broken_reason {
        set_field!("broken_reason", v.map(|r| r.as_str().to_string()));
    }
    if let Some(v) = patch.trusted {
        set_field!("trusted", v as i64);
    }
    if let Some(v) = patch.archived {
        set_field!("archived", v as i64);
    }
    if let Some(v) = patch.ship_score {
        set_field!("ship_score", v);
    }
    if let Some(v) = patch.deps_installed {
        set_field!("deps_installed", v as i64);
    }
    if let Some(v) = patch.has_env_example {
        set_field!("has_env_example", v as i64);
    }

    if sets.is_empty() {
        return get_project(conn, id);
    }

    let sql = format!(
        "UPDATE projects SET {} WHERE id = ?{}",
        sets.join(", "),
        sets.len() + 1
    );
    values.push(Box::new(id));

    let param_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())?;

    get_project(conn, id)
}

pub fn set_tags(conn: &Connection, id: i64, tags: &[String]) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM tags WHERE project_id = ?1", params![id])?;
    let mut stmt =
        conn.prepare("INSERT OR IGNORE INTO tags (project_id, label) VALUES (?1, ?2)")?;
    let mut seen = std::collections::HashSet::new();
    for tag in tags {
        let trimmed = tag.trim();
        if trimmed.is_empty() || !seen.insert(trimmed.to_string()) {
            continue;
        }
        stmt.execute(params![id, trimmed])?;
    }
    Ok(())
}

pub fn delete_project(conn: &Connection, id: i64) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM screenshots WHERE project_id = ?1", params![id])?;
    conn.execute("DELETE FROM tags WHERE project_id = ?1", params![id])?;
    conn.execute("DELETE FROM activity WHERE project_id = ?1", params![id])?;
    conn.execute("DELETE FROM run_log WHERE project_id = ?1", params![id])?;
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn archive_project(conn: &Connection, id: i64, archived: bool) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE projects SET archived = ?1 WHERE id = ?2",
        params![archived as i64, id],
    )?;
    Ok(())
}

pub fn insert_activity(
    conn: &Connection,
    project_id: i64,
    kind: ActivityKind,
    occurred_at: Option<String>,
    detail: Option<String>,
) -> rusqlite::Result<i64> {
    let occurred_at = occurred_at.unwrap_or_else(now);
    conn.execute(
        "INSERT INTO activity (project_id, kind, occurred_at, detail) VALUES (?1, ?2, ?3, ?4)",
        params![project_id, kind.as_str(), occurred_at, detail],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn list_activity(conn: &Connection, project_id: i64) -> rusqlite::Result<Vec<ActivityEvent>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, kind, occurred_at, detail FROM activity
         WHERE project_id = ?1 ORDER BY occurred_at DESC",
    )?;
    let rows = stmt.query_map(params![project_id], |row| {
        let kind: String = row.get(2)?;
        Ok(ActivityEvent {
            id: row.get(0)?,
            project_id: row.get(1)?,
            kind: ActivityKind::from_str(&kind),
            occurred_at: row.get(3)?,
            detail: row.get(4)?,
        })
    })?;
    rows.collect()
}

pub fn insert_run_log(
    conn: &Connection,
    project_id: i64,
    started_at: &str,
    exit_code: Option<i64>,
    stdout_tail: Option<&str>,
    outcome: &str,
) -> rusqlite::Result<i64> {
    conn.execute(
        "INSERT INTO run_log (project_id, started_at, exit_code, stdout_tail, outcome)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![project_id, started_at, exit_code, stdout_tail, outcome],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn upsert_screenshot(
    conn: &Connection,
    project_id: i64,
    variant: &str,
    file_path: &str,
) -> rusqlite::Result<()> {
    conn.execute(
        "DELETE FROM screenshots WHERE project_id = ?1 AND variant = ?2",
        params![project_id, variant],
    )?;
    conn.execute(
        "INSERT INTO screenshots (project_id, variant, file_path, captured_at) VALUES (?1, ?2, ?3, ?4)",
        params![project_id, variant, file_path, now()],
    )?;
    insert_activity(conn, project_id, ActivityKind::Screenshot, None, None)?;
    Ok(())
}

pub fn list_all_projects(conn: &Connection) -> rusqlite::Result<Vec<Project>> {
    let query = ProjectQuery {
        shelf: ShelfId::All,
        search: String::new(),
        frameworks: Vec::new(),
        tags: Vec::new(),
        sort: SortMode::Modified,
    };
    list_projects(conn, &query)
}

pub fn list_project_paths(conn: &Connection) -> rusqlite::Result<Vec<String>> {
    let mut stmt = conn.prepare("SELECT path FROM projects WHERE archived = 0")?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    rows.collect()
}

pub fn list_roots(conn: &Connection) -> rusqlite::Result<Vec<ScanRoot>> {
    let mut stmt = conn.prepare(
        "SELECT r.id, r.path, r.enabled, r.last_scanned,
                (SELECT COUNT(*) FROM projects p WHERE p.path = r.path OR p.path LIKE r.path || '/%') AS project_count
         FROM scan_roots r ORDER BY r.path",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ScanRoot {
            id: row.get(0)?,
            path: row.get(1)?,
            enabled: row.get::<_, i64>(2)? != 0,
            last_scanned: row.get(3)?,
            project_count: row.get(4)?,
        })
    })?;
    rows.collect()
}

pub fn add_root(conn: &Connection, path: &str) -> rusqlite::Result<ScanRoot> {
    conn.execute(
        "INSERT OR IGNORE INTO scan_roots (path, enabled) VALUES (?1, 1)",
        params![path],
    )?;
    conn.query_row(
        "SELECT id, path, enabled, last_scanned FROM scan_roots WHERE path = ?1",
        params![path],
        |row| {
            Ok(ScanRoot {
                id: row.get(0)?,
                path: row.get(1)?,
                enabled: row.get::<_, i64>(2)? != 0,
                last_scanned: row.get(3)?,
                project_count: 0,
            })
        },
    )
}

pub fn remove_root(conn: &Connection, id: i64) -> rusqlite::Result<()> {
    conn.execute("DELETE FROM scan_roots WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn library_stats(conn: &Connection) -> rusqlite::Result<LibraryStats> {
    let total: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE archived = 0",
        [],
        |row| row.get(0),
    )?;
    let runnable: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE archived = 0 AND status IN ('runnable', 'running')",
        [],
        |row| row.get(0),
    )?;
    let shipped: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE archived = 0 AND status = 'shipped'",
        [],
        |row| row.get(0),
    )?;
    let broken: i64 = conn.query_row(
        "SELECT COUNT(*) FROM projects WHERE archived = 0 AND status = 'broken'",
        [],
        |row| row.get(0),
    )?;
    let with_screenshots: i64 = conn.query_row(
        "SELECT COUNT(DISTINCT project_id) FROM screenshots s
         JOIN projects p ON p.id = s.project_id WHERE p.archived = 0",
        [],
        |row| row.get(0),
    )?;
    let total_loc: i64 = conn.query_row(
        "SELECT COALESCE(SUM(loc), 0) FROM projects WHERE archived = 0",
        [],
        |row| row.get(0),
    )?;
    let oldest_project: Option<String> = conn
        .query_row(
            "SELECT name FROM projects WHERE archived = 0 ORDER BY first_seen ASC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()?;

    let mut by_framework = std::collections::HashMap::new();
    let mut stmt = conn.prepare(
        "SELECT framework, COUNT(*) FROM projects WHERE archived = 0 GROUP BY framework",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    })?;
    for row in rows {
        let (framework, count) = row?;
        by_framework.insert(framework, count);
    }

    Ok(LibraryStats {
        total,
        runnable,
        shipped,
        broken,
        with_screenshots,
        by_framework,
        total_loc,
        oldest_project,
    })
}

fn shelf_clause(shelf: ShelfId) -> &'static str {
    match shelf {
        ShelfId::Continue => "AND last_modified >= datetime('now', '-14 days')",
        ShelfId::Unsorted => "AND status = 'unknown'",
        ShelfId::Discovered => "AND first_seen >= datetime('now', '-7 days')",
        ShelfId::Shipped => {
            "AND (status = 'shipped' OR EXISTS (SELECT 1 FROM tags t WHERE t.project_id = projects.id AND t.label = 'shipped'))"
        }
        ShelfId::Experiments => "AND status = 'experiment'",
        ShelfId::InProgress => "AND status = 'in-progress'",
        ShelfId::Attention => {
            "AND (status = 'broken' OR EXISTS (SELECT 1 FROM tags t WHERE t.project_id = projects.id AND t.label = 'needs-work'))"
        }
        ShelfId::Dead => "AND status = 'dead'",
        ShelfId::Archived => "",
        ShelfId::All => "",
    }
}

fn sort_clause(sort: SortMode) -> &'static str {
    match sort {
        SortMode::Modified => "ORDER BY last_modified DESC",
        SortMode::Name => "ORDER BY name COLLATE NOCASE ASC",
        SortMode::Score => "ORDER BY ship_score IS NULL, ship_score DESC",
        SortMode::Discovered => "ORDER BY first_seen DESC",
    }
}

pub fn list_projects(conn: &Connection, query: &ProjectQuery) -> rusqlite::Result<Vec<Project>> {
    let archived_filter = if query.shelf == ShelfId::Archived {
        "archived = 1"
    } else {
        "archived = 0"
    };
    let mut sql = format!("SELECT * FROM projects WHERE {archived_filter} ");
    sql.push_str(shelf_clause(query.shelf));
    sql.push(' ');

    let search = query.search.trim();
    let mut bind_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if !search.is_empty() {
        sql.push_str(
            "AND (name LIKE ?1 OR path LIKE ?1 OR framework LIKE ?1 OR readme_summary LIKE ?1) ",
        );
        bind_values.push(Box::new(format!("%{}%", search)));
    }

    let framework_placeholders: Vec<Framework> = query.frameworks.clone();
    if !framework_placeholders.is_empty() {
        let start = bind_values.len() + 1;
        let placeholders: Vec<String> = framework_placeholders
            .iter()
            .enumerate()
            .map(|(i, _)| format!("?{}", start + i))
            .collect();
        sql.push_str(&format!("AND framework IN ({}) ", placeholders.join(", ")));
        for framework in &framework_placeholders {
            bind_values.push(Box::new(framework.as_str().to_string()));
        }
    }

    sql.push_str(sort_clause(query.sort));

    let param_refs: Vec<&dyn rusqlite::ToSql> = bind_values.iter().map(|v| v.as_ref()).collect();
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params_from_iter(param_refs), |row| {
        project_core_from_row(row)
    })?;

    let mut projects = Vec::new();
    for row in rows {
        let project = hydrate_project(conn, row?)?;
        if !query.tags.is_empty() {
            let has_all = query.tags.iter().all(|t| project.tags.contains(t));
            if !has_all {
                continue;
            }
        }
        projects.push(project);
    }

    Ok(projects)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ProjectQuery, ShelfId, SortMode};

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        conn
    }

    fn sample_input(path: &str, name: &str) -> NewProjectInput {
        NewProjectInput {
            homepage: None,
            path: path.to_string(),
            name: name.to_string(),
            framework: Framework::Vite,
            language: Some("TypeScript".to_string()),
            package_manager: PackageManager::Npm,
            last_modified: now(),
            git_branch: Some("main".to_string()),
            git_remote: None,
            git_dirty: false,
            last_commit_at: None,
            loc: 1000,
            readme_summary: Some("a test project".to_string()),
            run_cmd: Some("npm run dev".to_string()),
            run_url: Some("http://localhost:5173".to_string()),
            port: Some(5173),
            status: ProjectStatus::Runnable,
            deps_installed: true,
            has_env_example: false,
        }
    }

    #[test]
    fn migrations_run_clean_and_are_idempotent() {
        let conn = setup();
        run_migrations(&conn).unwrap();
        run_migrations(&conn).unwrap();
        let version: i64 = conn
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .unwrap();
        assert_eq!(version as usize, MIGRATIONS.len());

        let table_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(table_count, 1);
    }

    #[test]
    fn finds_a_common_project_icon() {
        let root = tempfile::tempdir().unwrap();
        std::fs::create_dir(root.path().join("public")).unwrap();
        std::fs::write(root.path().join("public/logo.svg"), "<svg />").unwrap();

        assert_eq!(
            project_icon(root.path().to_str().unwrap()),
            Some(
                root.path()
                    .join("public/logo.svg")
                    .to_string_lossy()
                    .to_string()
            )
        );
    }

    #[test]
    fn gem_packages_are_removed_from_existing_catalogs() {
        let conn = setup();
        upsert_project(
            &conn,
            &sample_input(
                "/Users/me/.rubies/3.4.0/lib/ruby/gems/3.4.0/gems/bcrypt",
                "bcrypt",
            ),
        )
        .unwrap();
        upsert_project(
            &conn,
            &sample_input("/Users/me/code/workbench", "Workbench"),
        )
        .unwrap();

        conn.execute_batch(MIGRATIONS[4]).unwrap();

        let name: String = conn
            .query_row("SELECT name FROM projects", [], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "Workbench");
    }

    #[test]
    fn hidden_directories_are_removed_from_existing_catalogs() {
        let conn = setup();
        upsert_project(&conn, &sample_input("/Users/me/.ruby-lsp", ".ruby-lsp")).unwrap();
        upsert_project(&conn, &sample_input("/Users/me/.npm/_npx/hash", "hash")).unwrap();
        upsert_project(
            &conn,
            &sample_input("/Users/me/code/workbench", "Workbench"),
        )
        .unwrap();

        let hidden_dirs = MIGRATIONS.iter().find(|m| m.contains("GLOB")).unwrap();
        conn.execute_batch(hidden_dirs).unwrap();

        let name: String = conn
            .query_row("SELECT name FROM projects", [], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "Workbench");
    }

    #[test]
    fn upsert_updates_in_place_and_preserves_fields() {
        let conn = setup();
        let input = sample_input("/code/demo", "Demo");
        let created = upsert_project(&conn, &input).unwrap();
        set_tags(&conn, created.id, &["prototype".to_string()]).unwrap();
        conn.execute(
            "UPDATE projects SET trusted = 1, status = 'shipped' WHERE id = ?1",
            params![created.id],
        )
        .unwrap();

        let mut second = sample_input("/code/demo", "Demo Renamed");
        second.loc = 2000;
        let updated = upsert_project(&conn, &second).unwrap();

        assert_eq!(updated.id, created.id);
        assert_eq!(updated.name, "Demo Renamed");
        assert_eq!(updated.loc, 2000);
        assert_eq!(updated.first_seen, created.first_seen);
        assert!(updated.trusted);
        assert_eq!(updated.status, ProjectStatus::Shipped);
        assert_eq!(updated.tags, vec!["prototype".to_string()]);

        let total: i64 = conn
            .query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0))
            .unwrap();
        assert_eq!(total, 1);
    }

    #[test]
    fn shelf_query_returns_expected_rows() {
        let conn = setup();

        let shipped = upsert_project(&conn, &sample_input("/code/shipped", "Shipped App")).unwrap();
        conn.execute(
            "UPDATE projects SET status = 'shipped' WHERE id = ?1",
            params![shipped.id],
        )
        .unwrap();

        let dead = upsert_project(&conn, &sample_input("/code/dead", "Dead App")).unwrap();
        conn.execute(
            "UPDATE projects SET status = 'dead' WHERE id = ?1",
            params![dead.id],
        )
        .unwrap();

        let gem = upsert_project(&conn, &sample_input("/code/gem", "Gem App")).unwrap();
        conn.execute(
            "UPDATE projects SET status = 'unknown', last_modified = datetime('now', '-60 days') WHERE id = ?1",
            params![gem.id],
        )
        .unwrap();

        let active = upsert_project(&conn, &sample_input("/code/active", "Active App")).unwrap();

        let query_shipped = ProjectQuery {
            shelf: ShelfId::Shipped,
            search: String::new(),
            frameworks: vec![],
            tags: vec![],
            sort: SortMode::Modified,
        };
        let shipped_rows = list_projects(&conn, &query_shipped).unwrap();
        assert_eq!(shipped_rows.len(), 1);
        assert_eq!(shipped_rows[0].id, shipped.id);

        let query_dead = ProjectQuery {
            shelf: ShelfId::Dead,
            search: String::new(),
            frameworks: vec![],
            tags: vec![],
            sort: SortMode::Modified,
        };
        let dead_rows = list_projects(&conn, &query_dead).unwrap();
        assert_eq!(dead_rows.len(), 1);
        assert_eq!(dead_rows[0].id, dead.id);

        let query_gems = ProjectQuery {
            shelf: ShelfId::Unsorted,
            search: String::new(),
            frameworks: vec![],
            tags: vec![],
            sort: SortMode::Modified,
        };
        let gem_rows = list_projects(&conn, &query_gems).unwrap();
        assert_eq!(gem_rows.len(), 1);
        assert_eq!(gem_rows[0].id, gem.id);

        let query_continue = ProjectQuery {
            shelf: ShelfId::Continue,
            search: String::new(),
            frameworks: vec![],
            tags: vec![],
            sort: SortMode::Modified,
        };
        let continue_rows = list_projects(&conn, &query_continue).unwrap();
        let continue_ids: Vec<i64> = continue_rows.iter().map(|p| p.id).collect();
        assert!(continue_ids.contains(&active.id));
        assert!(continue_ids.contains(&shipped.id));
        assert!(!continue_ids.contains(&gem.id));

        let query_all = ProjectQuery {
            shelf: ShelfId::All,
            search: String::new(),
            frameworks: vec![],
            tags: vec![],
            sort: SortMode::Name,
        };
        let all_rows = list_projects(&conn, &query_all).unwrap();
        assert_eq!(all_rows.len(), 4);
    }

    #[test]
    fn shelves_split_by_the_status_the_user_picked() {
        let conn = setup();

        let plain = upsert_project(&conn, &sample_input("/code/plain", "Plain")).unwrap();
        let experiment = upsert_project(&conn, &sample_input("/code/lab", "Lab")).unwrap();
        let in_progress =
            upsert_project(&conn, &sample_input("/code/wip", "Work In Progress")).unwrap();
        let broken = upsert_project(&conn, &sample_input("/code/broken", "Broken")).unwrap();
        let needs_work = upsert_project(&conn, &sample_input("/code/tagged", "Tagged")).unwrap();

        for (id, status) in [
            (plain.id, "unknown"),
            (experiment.id, "experiment"),
            (in_progress.id, "in-progress"),
            (broken.id, "broken"),
            (needs_work.id, "unknown"),
        ] {
            conn.execute(
                "UPDATE projects SET status = ?2 WHERE id = ?1",
                params![id, status],
            )
            .unwrap();
        }
        set_tags(&conn, needs_work.id, &["needs-work".to_string()]).unwrap();

        let query = |shelf| ProjectQuery {
            shelf,
            search: String::new(),
            frameworks: Vec::new(),
            tags: Vec::new(),
            sort: SortMode::Modified,
        };

        let unsorted: Vec<i64> = list_projects(&conn, &query(ShelfId::Unsorted))
            .unwrap()
            .iter()
            .map(|p| p.id)
            .collect();
        assert!(unsorted.contains(&plain.id));
        assert!(unsorted.contains(&needs_work.id));
        assert!(!unsorted.contains(&experiment.id));

        let experiments = list_projects(&conn, &query(ShelfId::Experiments)).unwrap();
        assert_eq!(experiments.len(), 1);
        assert_eq!(experiments[0].id, experiment.id);

        let wip = list_projects(&conn, &query(ShelfId::InProgress)).unwrap();
        assert_eq!(wip.len(), 1);
        assert_eq!(wip[0].id, in_progress.id);

        let attention = list_projects(&conn, &query(ShelfId::Attention)).unwrap();
        let attention_ids: Vec<i64> = attention.iter().map(|p| p.id).collect();
        assert!(attention_ids.contains(&broken.id));
        assert!(attention_ids.contains(&needs_work.id));
    }

    #[test]
    fn archived_projects_are_hidden_everywhere_except_the_archived_shelf() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let live = upsert_project(&conn, &sample_input("/code/live", "Live")).unwrap();
        let gone = upsert_project(&conn, &sample_input("/code/gone", "Gone")).unwrap();
        archive_project(&conn, gone.id, true).unwrap();

        let query = |shelf| ProjectQuery {
            shelf,
            search: String::new(),
            frameworks: Vec::new(),
            tags: Vec::new(),
            sort: SortMode::Modified,
        };

        let all = list_projects(&conn, &query(ShelfId::All)).unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].id, live.id);

        let archived = list_projects(&conn, &query(ShelfId::Archived)).unwrap();
        assert_eq!(archived.len(), 1);
        assert_eq!(archived[0].id, gone.id);
        assert!(archived[0].archived);
    }

    #[test]
    fn unarchiving_returns_a_project_to_the_main_shelves() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let project = upsert_project(&conn, &sample_input("/code/back", "Back")).unwrap();
        archive_project(&conn, project.id, true).unwrap();
        archive_project(&conn, project.id, false).unwrap();

        let query = ProjectQuery {
            shelf: ShelfId::All,
            search: String::new(),
            frameworks: Vec::new(),
            tags: Vec::new(),
            sort: SortMode::Modified,
        };
        assert_eq!(list_projects(&conn, &query).unwrap().len(), 1);
    }

    #[test]
    fn deleting_a_project_removes_its_related_rows() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let project = upsert_project(&conn, &sample_input("/code/doomed", "Doomed")).unwrap();
        set_tags(&conn, project.id, &["prototype".to_string()]).unwrap();
        upsert_screenshot(&conn, project.id, "desktop", "/tmp/a.png").unwrap();

        delete_project(&conn, project.id).unwrap();

        assert!(get_project(&conn, project.id).unwrap().is_none());
        let tags: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM tags WHERE project_id = ?1",
                params![project.id],
                |r| r.get(0),
            )
            .unwrap();
        let shots: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM screenshots WHERE project_id = ?1",
                params![project.id],
                |r| r.get(0),
            )
            .unwrap();
        let activity: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM activity WHERE project_id = ?1",
                params![project.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!((tags, shots, activity), (0, 0, 0));
    }

    #[test]
    fn deleting_one_project_leaves_others_intact() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();

        let keep = upsert_project(&conn, &sample_input("/code/keep", "Keep")).unwrap();
        let drop = upsert_project(&conn, &sample_input("/code/drop", "Drop")).unwrap();

        delete_project(&conn, drop.id).unwrap();

        assert!(get_project(&conn, keep.id).unwrap().is_some());
        assert!(get_project(&conn, drop.id).unwrap().is_none());
    }

    #[test]
    fn homepage_round_trips_through_a_patch() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        let project = upsert_project(&conn, &sample_input("/code/site", "Site")).unwrap();
        assert!(project.homepage.is_none());

        let patch = ProjectPatch {
            homepage: Some(Some("https://example.com".to_string())),
            ..Default::default()
        };
        let updated = update_project(&conn, project.id, &patch).unwrap().unwrap();
        assert_eq!(updated.homepage.as_deref(), Some("https://example.com"));

        let cleared = ProjectPatch {
            homepage: Some(None),
            ..Default::default()
        };
        let after = update_project(&conn, project.id, &cleared)
            .unwrap()
            .unwrap();
        assert!(after.homepage.is_none());
    }
}
