mod agents;
mod ai;
mod commands;
mod db;
mod detail;
mod doctor;
mod files;
mod folders;
mod handoff;
mod heatmap;
mod mcp;
pub mod mcp_server;
mod media;
mod misc;
mod models;
mod openers;
mod plugins;
mod portfolio;
mod pty;
mod run;
mod scan;
mod score;
mod settings;
mod shots;
mod skills;
mod snippet;
mod timeline;
mod usage;

use std::sync::Mutex;

use db::DbState;
use files::{ListingCache, WatcherState};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(run::ProcessRegistry::default())
        .manage(run::CaptureCancel::default())
        .manage(timeline::TimelineCache::default())
        .manage(pty::PtyRegistry::default())
        .setup(|app| {
            let conn = db::open().expect("failed to open workbench database");
            let _ = conn.execute(
                "UPDATE projects SET status = 'runnable', run_url = NULL, port = NULL WHERE status = 'running'",
                [],
            );
            app.manage(DbState(Mutex::new(conn)));
            app.manage(ListingCache::default());
            app.manage(WatcherState::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_projects,
            commands::get_project,
            commands::update_project,
            commands::set_tags,
            commands::archive_project,
            commands::forget_project,
            commands::trash_project_folder,
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
            detail::init_repository,
            run::run_project,
            run::stop_project,
            run::trust_project,
            run::capture_all,
            run::capture_project,
            shots::import_screenshot_file,
            shots::import_screenshot_bytes,
            shots::pick_image_file,
            run::capture_cancel,
            ai::build_ai_prompt,
            ai::start_ai_session,
            ai::list_ai_sessions,
            ai::kill_ai_session,
            ai::detect_ai_clis,
            openers::open_in,
            misc::pick_folder,
            pty::pty_open,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_close,
            pty::pty_is_open,
            folders::search_folders,
            heatmap::contribution_heatmap,
            usage::token_usage,
            timeline::timeline_page,
            media::project_media,
            media::media_details,
            media::project_videos,
            snippet::project_snippet,
            skills::list_skills,
            skills::read_skill,
            skills::toggle_skill,
            skills::install_skill,
            skills::search_skill_registry,
            agents::detect_agents,
            mcp::list_mcp_servers,
            plugins::list_plugins,
            plugins::set_plugin_enabled,
            plugins::set_plugin_credential,
            plugins::set_plugin_selection,
            plugins::plugin_sources,
            plugins::plugin_items,
            plugins::plugin_item_detail,
            plugins::plugin_source_members,
            mcp::workbench_mcp,
            mcp::install_workbench_mcp,
            portfolio::portfolio_state,
            portfolio::portfolio_add_image,
            portfolio::portfolio_add_image_file,
            portfolio::portfolio_remove_image,
            portfolio::portfolio_save_voice,
            portfolio::portfolio_save_doc,
            portfolio::portfolio_clear_chat,
            portfolio::portfolio_chat,
            portfolio::portfolio_generate,
            handoff::start_run_fix,
            handoff::poll_handoff,
            doctor::system_checks,
            misc::disk_reclaim_scan,
            files::fs_list_dir,
            files::fs_find_documents,
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
