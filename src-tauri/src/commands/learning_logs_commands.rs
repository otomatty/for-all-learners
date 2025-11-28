//! Learning Logs Tauri Commands
//!
//! 学習ログ操作のTauriコマンド
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

use crate::db::models::LocalLearningLog;
use crate::db::LocalDB;
use tauri::State;

/// エラー型のエイリアス
type CmdResult<T> = Result<T, String>;

/// ユーザーの学習ログを取得
#[tauri::command]
pub async fn get_learning_logs(
    db: State<'_, LocalDB>,
    user_id: String,
) -> CmdResult<Vec<LocalLearningLog>> {
    db.get_learning_logs_by_user(&user_id)
        .map_err(|e| e.to_string())
}

/// カードの学習ログを取得
#[tauri::command]
pub async fn get_learning_logs_by_card(
    db: State<'_, LocalDB>,
    card_id: String,
) -> CmdResult<Vec<LocalLearningLog>> {
    db.get_learning_logs_by_card(&card_id)
        .map_err(|e| e.to_string())
}

/// 学習ログを作成
#[tauri::command]
pub async fn create_learning_log(db: State<'_, LocalDB>, log: LocalLearningLog) -> CmdResult<()> {
    db.insert_learning_log(&log).map_err(|e| e.to_string())
}

/// 同期待ち学習ログを取得
#[tauri::command]
pub async fn get_pending_sync_learning_logs(
    db: State<'_, LocalDB>,
) -> CmdResult<Vec<LocalLearningLog>> {
    db.get_pending_sync_learning_logs()
        .map_err(|e| e.to_string())
}

