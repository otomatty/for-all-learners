//! Pages Tauri Commands
//!
//! ページ操作のTauriコマンド
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

use crate::db::models::{LocalPage, PageUpdate};
use crate::db::LocalDB;
use tauri::State;

/// エラー型のエイリアス
type CmdResult<T> = Result<T, String>;

/// ユーザーの全ページを取得
#[tauri::command]
pub async fn get_pages(db: State<'_, LocalDB>, user_id: String) -> CmdResult<Vec<LocalPage>> {
    db.get_pages_by_user(&user_id).map_err(|e| e.to_string())
}

/// ノートに紐づくページを取得
#[tauri::command]
pub async fn get_pages_by_note(
    db: State<'_, LocalDB>,
    note_id: String,
) -> CmdResult<Vec<LocalPage>> {
    db.get_pages_by_note(&note_id).map_err(|e| e.to_string())
}

/// IDでページを取得
#[tauri::command]
pub async fn get_page(db: State<'_, LocalDB>, id: String) -> CmdResult<Option<LocalPage>> {
    db.get_page_by_id(&id).map_err(|e| e.to_string())
}

/// ページを作成
#[tauri::command]
pub async fn create_page(db: State<'_, LocalDB>, page: LocalPage) -> CmdResult<()> {
    db.insert_page(&page).map_err(|e| e.to_string())
}

/// ページを更新
#[tauri::command]
pub async fn update_page(
    db: State<'_, LocalDB>,
    id: String,
    updates: PageUpdate,
) -> CmdResult<Option<LocalPage>> {
    db.update_page(&id, updates).map_err(|e| e.to_string())
}

/// ページを削除（論理削除）
#[tauri::command]
pub async fn delete_page(db: State<'_, LocalDB>, id: String) -> CmdResult<bool> {
    db.delete_page(&id).map_err(|e| e.to_string())
}

/// 同期待ちページを取得
#[tauri::command]
pub async fn get_pending_sync_pages(db: State<'_, LocalDB>) -> CmdResult<Vec<LocalPage>> {
    db.get_pending_sync_pages().map_err(|e| e.to_string())
}

/// ページを同期済みにマーク
#[tauri::command]
pub async fn mark_page_synced(
    db: State<'_, LocalDB>,
    id: String,
    server_updated_at: String,
) -> CmdResult<()> {
    db.mark_page_synced(&id, &server_updated_at)
        .map_err(|e| e.to_string())
}

