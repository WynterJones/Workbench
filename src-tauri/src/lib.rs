mod commands;
mod db;
mod models;
mod settings;

use std::sync::Mutex;

use db::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let conn = db::open().expect("failed to open workbench database");
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_projects,
            commands::get_project,
            commands::update_project,
            commands::set_tags,
            commands::archive_project,
            commands::list_roots,
            commands::add_root,
            commands::remove_root,
            commands::library_stats,
            commands::project_activity,
            commands::get_settings,
            commands::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
