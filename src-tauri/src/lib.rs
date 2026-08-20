mod agents;
mod ai;
mod commands;
mod db;
mod detail;
mod files;
mod folders;
mod misc;
mod models;
mod openers;
mod run;
mod scan;
mod score;
mod settings;
mod skills;

use std::sync::Mutex;

use db::DbState;
use files::WatcherState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(run::ProcessRegistry::default())
        .manage(run::CaptureCancel::default())
        .setup(|app| {
            let conn = db::open().expect("failed to open workbench database");
            app.manage(DbState(Mutex::new(conn)));
            app.manage(WatcherState::default());
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
            scan::start_scan,
            scan::ship_score,
            scan::project_todos,
            detail::project_readme,
            detail::project_commits,
            run::run_project,
            run::stop_project,
            run::trust_project,
            run::capture_all,
            run::capture_project,
            run::capture_cancel,
            ai::build_ai_prompt,
            ai::start_ai_session,
            ai::list_ai_sessions,
            ai::kill_ai_session,
            ai::detect_ai_clis,
            openers::open_in,
            misc::pick_folder,
            folders::search_folders,
            skills::list_skills,
            skills::read_skill,
            skills::toggle_skill,
            skills::install_skill,
            agents::detect_agents,
            misc::disk_reclaim_scan,
            files::fs_list_dir,
            files::fs_create_dir,
            files::fs_create_file,
            files::fs_rename,
            files::fs_move_entries,
            files::fs_copy_entries,
            files::fs_trash_entries,
            files::fs_get_info,
            files::fs_watch_directory,
            files::fs_unwatch_directory,
            files::fs_list_starters,
            files::fs_save_starter,
            files::fs_delete_starter,
            files::fs_save_folder_as_starter,
            files::fs_file_templates,
            files::fs_create_from_template,
            files::fs_scaffold_starter,
            files::fs_build_context,
            files::fs_read_file,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                run::kill_all_on_exit(&app_handle.state::<run::ProcessRegistry>());
            }
        });
}
