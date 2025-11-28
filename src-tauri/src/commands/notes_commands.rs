//! Notes Tauri Commands
//!
//! ノート操作のTauriコマンド
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

use crate::db::models::{LocalNote, NoteUpdate};
use crate::db::LocalDB;
use tauri::State;

/// エラー型のエイリアス
type CmdResult<T> = Result<T, String>;

/// ユーザーの全ノートを取得
#[tauri::command]
pub async fn get_notes(db: State<'_, LocalDB>, owner_id: String) -> CmdResult<Vec<LocalNote>> {
    db.get_notes_by_owner(&owner_id)
        .map_err(|e| e.to_string())
}

/// IDでノートを取得
#[tauri::command]
pub async fn get_note(db: State<'_, LocalDB>, id: String) -> CmdResult<Option<LocalNote>> {
    db.get_note_by_id(&id).map_err(|e| e.to_string())
}

/// ノートを作成
#[tauri::command]
pub async fn create_note(db: State<'_, LocalDB>, note: LocalNote) -> CmdResult<()> {
    db.insert_note(&note).map_err(|e| e.to_string())
}

/// ノートを更新
#[tauri::command]
pub async fn update_note(
    db: State<'_, LocalDB>,
    id: String,
    updates: NoteUpdate,
) -> CmdResult<Option<LocalNote>> {
    db.update_note(&id, updates).map_err(|e| e.to_string())
}

/// ノートを削除（論理削除）
#[tauri::command]
pub async fn delete_note(db: State<'_, LocalDB>, id: String) -> CmdResult<bool> {
    db.delete_note(&id).map_err(|e| e.to_string())
}

/// ノートを物理削除
#[tauri::command]
pub async fn hard_delete_note(db: State<'_, LocalDB>, id: String) -> CmdResult<()> {
    db.hard_delete_note(&id).map_err(|e| e.to_string())
}

/// 同期待ちノートを取得
#[tauri::command]
pub async fn get_pending_sync_notes(db: State<'_, LocalDB>) -> CmdResult<Vec<LocalNote>> {
    db.get_pending_sync_notes().map_err(|e| e.to_string())
}

/// 削除済みノートを取得
#[tauri::command]
pub async fn get_deleted_notes(db: State<'_, LocalDB>) -> CmdResult<Vec<LocalNote>> {
    db.get_deleted_notes().map_err(|e| e.to_string())
}

/// ノートを同期済みにマーク
#[tauri::command]
pub async fn mark_note_synced(
    db: State<'_, LocalDB>,
    id: String,
    server_updated_at: String,
) -> CmdResult<()> {
    db.mark_note_synced(&id, &server_updated_at)
        .map_err(|e| e.to_string())
}

/// サーバーデータでノートを上書き
#[tauri::command]
pub async fn overwrite_note_with_server(db: State<'_, LocalDB>, note: LocalNote) -> CmdResult<()> {
    db.overwrite_note_with_server(&note)
        .map_err(|e| e.to_string())
}

