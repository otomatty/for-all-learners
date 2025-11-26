//! Milestones Tauri Commands
//!
//! マイルストーン操作のTauriコマンド
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

use crate::db::models::LocalMilestone;
use crate::db::LocalDB;
use tauri::State;

/// エラー型のエイリアス
type CmdResult<T> = Result<T, String>;

/// 学習目標に紐づくマイルストーンを取得
#[tauri::command]
pub async fn get_milestones(
    db: State<'_, LocalDB>,
    goal_id: String,
) -> CmdResult<Vec<LocalMilestone>> {
    db.get_milestones_by_goal(&goal_id)
        .map_err(|e| e.to_string())
}

/// IDでマイルストーンを取得
#[tauri::command]
pub async fn get_milestone(
    db: State<'_, LocalDB>,
    id: String,
) -> CmdResult<Option<LocalMilestone>> {
    db.get_milestone_by_id(&id).map_err(|e| e.to_string())
}

/// マイルストーンを作成
#[tauri::command]
pub async fn create_milestone(db: State<'_, LocalDB>, milestone: LocalMilestone) -> CmdResult<()> {
    db.insert_milestone(&milestone).map_err(|e| e.to_string())
}

/// マイルストーンを削除（論理削除）
#[tauri::command]
pub async fn delete_milestone(db: State<'_, LocalDB>, id: String) -> CmdResult<bool> {
    db.delete_milestone(&id).map_err(|e| e.to_string())
}

/// 同期待ちマイルストーンを取得
#[tauri::command]
pub async fn get_pending_sync_milestones(
    db: State<'_, LocalDB>,
) -> CmdResult<Vec<LocalMilestone>> {
    db.get_pending_sync_milestones()
        .map_err(|e| e.to_string())
}

