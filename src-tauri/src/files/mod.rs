mod context;
mod fs_ops;
mod listing;
mod scaffold;
mod starters;
mod watch;
mod read;

pub use watch::WatcherState;

use std::path::PathBuf;

use tauri::{AppHandle, State};

use crate::db::DbState;
use context::ContextOptions;
use listing::{FsEntry, ListOptions};
use starters::{FileTemplate, StarterTemplate};

fn roots_from_state(state: &State<DbState>) -> Result<Vec<PathBuf>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    Ok(fs_ops::allowed_roots(&conn))
}

#[tauri::command]
pub fn fs_list_dir(
    state: State<DbState>,
    path: String,
    opts: ListOptions,
) -> Result<Vec<FsEntry>, String> {
    let roots = roots_from_state(&state)?;
    listing::list_dir(&path, &opts, &roots)
}

#[tauri::command]
pub fn fs_create_dir(state: State<DbState>, path: String) -> Result<String, String> {
    let roots = roots_from_state(&state)?;
    fs_ops::create_dir(&path, &roots)
}

#[tauri::command]
pub fn fs_create_file(
    state: State<DbState>,
    path: String,
    contents: String,
) -> Result<String, String> {
    let roots = roots_from_state(&state)?;
    fs_ops::create_file(&path, &contents, &roots)
}

#[tauri::command]
pub fn fs_rename(state: State<DbState>, path: String, new_name: String) -> Result<String, String> {
    let roots = roots_from_state(&state)?;
    fs_ops::rename(&path, &new_name, &roots)
}

#[tauri::command]
pub fn fs_move_entries(
    state: State<DbState>,
    paths: Vec<String>,
    dest_dir: String,
) -> Result<Vec<String>, String> {
    let roots = roots_from_state(&state)?;
    fs_ops::move_entries(&paths, &dest_dir, &roots)
}

#[tauri::command]
pub fn fs_copy_entries(
    state: State<DbState>,
    paths: Vec<String>,
    dest_dir: String,
) -> Result<Vec<String>, String> {
    let roots = roots_from_state(&state)?;
    fs_ops::copy_entries(&paths, &dest_dir, &roots)
}

#[tauri::command]
pub fn fs_trash_entries(state: State<DbState>, paths: Vec<String>) -> Result<(), String> {
    let roots = roots_from_state(&state)?;
    fs_ops::trash_entries(&paths, &roots)
}

#[tauri::command]
pub fn fs_get_info(state: State<DbState>, path: String) -> Result<fs_ops::FsInfo, String> {
    let roots = roots_from_state(&state)?;
    fs_ops::get_info(&path, &roots)
}

#[tauri::command]
pub fn fs_watch_directory(
    app: AppHandle,
    watcher: State<WatcherState>,
    path: String,
) -> Result<(), String> {
    watch::start(app, &watcher, &path)
}

#[tauri::command]
pub fn fs_unwatch_directory(watcher: State<WatcherState>) -> Result<(), String> {
    watch::stop(&watcher);
    Ok(())
}

#[tauri::command]
pub fn fs_list_starters() -> Result<Vec<StarterTemplate>, String> {
    starters::list_starters()
}

#[tauri::command]
pub fn fs_save_starter(template: StarterTemplate) -> Result<StarterTemplate, String> {
    starters::save_starter(template)
}

#[tauri::command]
pub fn fs_delete_starter(id: String) -> Result<(), String> {
    starters::delete_starter(&id)
}

#[tauri::command]
pub fn fs_save_folder_as_starter(
    state: State<DbState>,
    path: String,
    name: String,
) -> Result<StarterTemplate, String> {
    let roots = roots_from_state(&state)?;
    starters::save_folder_as_starter(&path, &name, &roots)
}

#[tauri::command]
pub fn fs_file_templates(framework: String) -> Vec<FileTemplate> {
    starters::file_templates(&framework)
}

#[tauri::command]
pub fn fs_create_from_template(
    state: State<DbState>,
    dir: String,
    template_id: String,
    name: String,
) -> Result<String, String> {
    let roots = roots_from_state(&state)?;
    starters::create_from_template(&dir, &template_id, &name, &roots)
}

#[tauri::command]
pub fn fs_scaffold_starter(
    app: AppHandle,
    state: State<DbState>,
    starter_id: String,
    parent_dir: String,
    project_name: String,
    confirmed: bool,
) -> Result<scaffold::ScaffoldResult, String> {
    let roots = roots_from_state(&state)?;
    scaffold::scaffold_starter(
        app,
        &starter_id,
        &parent_dir,
        &project_name,
        confirmed,
        &roots,
    )
}

#[tauri::command]
pub fn fs_build_context(
    state: State<DbState>,
    paths: Vec<String>,
    opts: ContextOptions,
) -> Result<String, String> {
    let roots = roots_from_state(&state)?;
    context::build_context(&paths, &opts, &roots)
}

#[tauri::command]
pub fn fs_read_file(
    state: State<DbState>,
    path: String,
    max_bytes: Option<u64>,
) -> Result<read::FileContents, String> {
    let roots = roots_from_state(&state)?;
    read::read_file(&path, &roots, max_bytes)
}
