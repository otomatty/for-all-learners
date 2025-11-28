//! Tauri アプリケーション エントリーポイント
//!
//! DEPENDENCY MAP:
//!
//! Children (Modules):
//!   ├─ db/ - ローカルデータベース
//!   └─ commands/ - Tauri コマンド
//!
//! Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
//! Issue: https://github.com/otomatty/for-all-learners/issues/192

use tauri::{AppHandle, Emitter, Manager};

pub mod commands;
pub mod db;

use db::LocalDB;

#[tauri::command]
async fn start_oauth_server(app: AppHandle) -> Result<u16, String> {
    tauri_plugin_oauth::start(move |url| {
        let _ = app.emit("oauth_callback", url);
    })
    .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // ローカルDB初期化
            let db = LocalDB::new(app.handle())
                .map_err(|e| format!("Failed to initialize LocalDB: {}", e))?;
            app.manage(db);
            log::info!("LocalDB initialized successfully");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // OAuth
            start_oauth_server,
            // Notes
            commands::get_notes,
            commands::get_note,
            commands::create_note,
            commands::update_note,
            commands::delete_note,
            commands::hard_delete_note,
            commands::get_pending_sync_notes,
            commands::get_deleted_notes,
            commands::mark_note_synced,
            commands::overwrite_note_with_server,
            // Pages
            commands::get_pages,
            commands::get_pages_by_note,
            commands::get_page,
            commands::create_page,
            commands::update_page,
            commands::delete_page,
            commands::get_pending_sync_pages,
            commands::mark_page_synced,
            // Decks
            commands::get_decks,
            commands::get_deck,
            commands::create_deck,
            commands::delete_deck,
            commands::get_pending_sync_decks,
            // Cards
            commands::get_cards,
            commands::get_card,
            commands::create_card,
            commands::delete_card,
            commands::get_due_cards,
            commands::get_pending_sync_cards,
            // Study Goals
            commands::get_study_goals,
            commands::get_study_goal,
            commands::create_study_goal,
            commands::delete_study_goal,
            commands::get_pending_sync_study_goals,
            // Learning Logs
            commands::get_learning_logs,
            commands::get_learning_logs_by_card,
            commands::create_learning_log,
            commands::get_pending_sync_learning_logs,
            // Milestones
            commands::get_milestones,
            commands::get_milestone,
            commands::create_milestone,
            commands::delete_milestone,
            commands::get_pending_sync_milestones,
            // User Settings
            commands::get_user_settings,
            commands::upsert_user_settings,
            commands::get_pending_sync_user_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
