//! User Settings Tauri Commands
//!
//! ユーザー設定操作のTauriコマンド
//!
//! DEPENDENCY MAP:
//!
//! Parents (Files that import this module):
//!   └─ src-tauri/src/commands/mod.rs
//!
//! Dependencies:
//!   └─ src-tauri/src/db/mod.rs (LocalDB)
//!
//! Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
//! Issue: https://github.com/otomatty/for-all-learners/issues/192

use crate::db::models::LocalUserSettings;
use crate::db::LocalDB;
use tauri::State;

/// エラー型のエイリアス
type CmdResult<T> = Result<T, String>;

/// ユーザー設定を取得
#[tauri::command]
pub async fn get_user_settings(
    db: State<'_, LocalDB>,
    user_id: String,
) -> CmdResult<Option<LocalUserSettings>> {
    db.get_user_settings(&user_id).map_err(|e| e.to_string())
}

/// ユーザー設定を作成または更新
#[tauri::command]
pub async fn upsert_user_settings(
    db: State<'_, LocalDB>,
    settings: LocalUserSettings,
) -> CmdResult<()> {
    db.upsert_user_settings(&settings)
        .map_err(|e| e.to_string())
}

/// 同期待ちユーザー設定を取得
#[tauri::command]
pub async fn get_pending_sync_user_settings(
    db: State<'_, LocalDB>,
) -> CmdResult<Vec<LocalUserSettings>> {
    db.get_pending_sync_user_settings()
        .map_err(|e| e.to_string())
}

