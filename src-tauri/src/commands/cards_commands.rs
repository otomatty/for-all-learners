//! Cards Tauri Commands
//!
//! カード操作のTauriコマンド
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

use crate::db::models::LocalCard;
use crate::db::LocalDB;
use tauri::State;

/// エラー型のエイリアス
type CmdResult<T> = Result<T, String>;

/// デッキの全カードを取得
#[tauri::command]
pub async fn get_cards(db: State<'_, LocalDB>, deck_id: String) -> CmdResult<Vec<LocalCard>> {
    db.get_cards_by_deck(&deck_id).map_err(|e| e.to_string())
}

/// IDでカードを取得
#[tauri::command]
pub async fn get_card(db: State<'_, LocalDB>, id: String) -> CmdResult<Option<LocalCard>> {
    db.get_card_by_id(&id).map_err(|e| e.to_string())
}

/// カードを作成
#[tauri::command]
pub async fn create_card(db: State<'_, LocalDB>, card: LocalCard) -> CmdResult<()> {
    db.insert_card(&card).map_err(|e| e.to_string())
}

/// カードを削除（論理削除）
#[tauri::command]
pub async fn delete_card(db: State<'_, LocalDB>, id: String) -> CmdResult<bool> {
    db.delete_card(&id).map_err(|e| e.to_string())
}

/// 期限切れカードを取得
#[tauri::command]
pub async fn get_due_cards(db: State<'_, LocalDB>, user_id: String) -> CmdResult<Vec<LocalCard>> {
    db.get_due_cards(&user_id).map_err(|e| e.to_string())
}

/// 同期待ちカードを取得
#[tauri::command]
pub async fn get_pending_sync_cards(db: State<'_, LocalDB>) -> CmdResult<Vec<LocalCard>> {
    db.get_pending_sync_cards().map_err(|e| e.to_string())
}

