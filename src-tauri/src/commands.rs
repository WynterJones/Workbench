use tauri::State;

use crate::db::{self, DbState};
use crate::models::{
    ActivityEvent, LibraryStats, Project, ProjectPatch, ProjectQuery, ScanRoot, Settings,
};
use crate::settings;

#[tauri::command]
pub fn list_projects(state: State<DbState>, query: ProjectQuery) -> Result<Vec<Project>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::list_projects(&conn, &query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project(state: State<DbState>, id: i64) -> Result<Project, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::get_project(&conn, id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("project {} not found", id))
}

#[tauri::command]
pub fn update_project(
    state: State<DbState>,
    id: i64,
    patch: ProjectPatch,
) -> Result<Project, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::update_project(&conn, id, &patch)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("project {} not found", id))
}

#[tauri::command]
pub fn set_tags(state: State<DbState>, id: i64, tags: Vec<String>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::set_tags(&conn, id, &tags).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn archive_project(state: State<DbState>, id: i64, archived: bool) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::archive_project(&conn, id, archived).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_roots(state: State<DbState>) -> Result<Vec<ScanRoot>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::list_roots(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_root(state: State<DbState>, path: String) -> Result<ScanRoot, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::add_root(&conn, &path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_root(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::remove_root(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn library_stats(state: State<DbState>) -> Result<LibraryStats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::library_stats(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn project_activity(
    state: State<DbState>,
    project_id: i64,
) -> Result<Vec<ActivityEvent>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::list_activity(&conn, project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settings(state: State<DbState>) -> Result<Settings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    settings::get_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(state: State<DbState>, settings: Settings) -> Result<Settings, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    settings::save_settings(&conn, &settings).map_err(|e| e.to_string())
}
