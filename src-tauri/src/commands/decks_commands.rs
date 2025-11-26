//! Decks Tauri Commands
//!
//! デッキ操作のTauriコマンド
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

use crate::db::models::LocalDeck;
use crate::db::LocalDB;
use tauri::State;

/// エラー型のエイリアス
type CmdResult<T> = Result<T, String>;

/// ユーザーの全デッキを取得
#[tauri::command]
pub async fn get_decks(db: State<'_, LocalDB>, user_id: String) -> CmdResult<Vec<LocalDeck>> {
    db.get_decks_by_user(&user_id).map_err(|e| e.to_string())
}

/// IDでデッキを取得
#[tauri::command]
pub async fn get_deck(db: State<'_, LocalDB>, id: String) -> CmdResult<Option<LocalDeck>> {
    db.get_deck_by_id(&id).map_err(|e| e.to_string())
}

/// デッキを作成
#[tauri::command]
pub async fn create_deck(db: State<'_, LocalDB>, deck: LocalDeck) -> CmdResult<()> {
    db.insert_deck(&deck).map_err(|e| e.to_string())
}

/// デッキを削除（論理削除）
#[tauri::command]
pub async fn delete_deck(db: State<'_, LocalDB>, id: String) -> CmdResult<bool> {
    db.delete_deck(&id).map_err(|e| e.to_string())
}

/// 同期待ちデッキを取得
#[tauri::command]
pub async fn get_pending_sync_decks(db: State<'_, LocalDB>) -> CmdResult<Vec<LocalDeck>> {
    db.get_pending_sync_decks().map_err(|e| e.to_string())
}

