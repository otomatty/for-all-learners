//! Study Goals Tauri Commands
//!
//! 学習目標操作のTauriコマンド
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

use crate::db::models::LocalStudyGoal;
use crate::db::LocalDB;
use tauri::State;

/// エラー型のエイリアス
type CmdResult<T> = Result<T, String>;

/// ユーザーの全学習目標を取得
#[tauri::command]
pub async fn get_study_goals(
    db: State<'_, LocalDB>,
    user_id: String,
) -> CmdResult<Vec<LocalStudyGoal>> {
    db.get_study_goals_by_user(&user_id)
        .map_err(|e| e.to_string())
}

/// IDで学習目標を取得
#[tauri::command]
pub async fn get_study_goal(
    db: State<'_, LocalDB>,
    id: String,
) -> CmdResult<Option<LocalStudyGoal>> {
    db.get_study_goal_by_id(&id).map_err(|e| e.to_string())
}

/// 学習目標を作成
#[tauri::command]
pub async fn create_study_goal(db: State<'_, LocalDB>, goal: LocalStudyGoal) -> CmdResult<()> {
    db.insert_study_goal(&goal).map_err(|e| e.to_string())
}

/// 学習目標を削除（論理削除）
#[tauri::command]
pub async fn delete_study_goal(db: State<'_, LocalDB>, id: String) -> CmdResult<bool> {
    db.delete_study_goal(&id).map_err(|e| e.to_string())
}

/// 同期待ち学習目標を取得
#[tauri::command]
pub async fn get_pending_sync_study_goals(
    db: State<'_, LocalDB>,
) -> CmdResult<Vec<LocalStudyGoal>> {
    db.get_pending_sync_study_goals()
        .map_err(|e| e.to_string())
}

