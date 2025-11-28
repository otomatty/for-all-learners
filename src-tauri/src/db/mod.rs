//! ローカルデータベースモジュール
//!
//! Tauri環境用のSQLiteデータベース管理
//!
//! DEPENDENCY MAP:
//!
//! Parents (Files that import this module):
//!   └─ src-tauri/src/lib.rs
//!
//! Children (Modules in this module):
//!   ├─ schema.rs - スキーマ定義
//!   ├─ models.rs - データモデル
//!   └─ error.rs - エラー型
//!
//! Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
//! Issue: https://github.com/otomatty/for-all-learners/issues/191

pub mod error;
pub mod models;
pub mod schema;

use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

pub use error::DbError;
pub use models::*;
pub use schema::*;

/// データベースファイル名
const DB_FILE_NAME: &str = "local.db";

/// ローカルデータベース
pub struct LocalDB {
    conn: Arc<Mutex<Connection>>,
}

impl LocalDB {
    /// 新しいデータベース接続を作成
    pub fn new(app_handle: &AppHandle) -> Result<Self, DbError> {
        let db_path = Self::get_db_path(app_handle)?;

        // ディレクトリを作成
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| DbError::IoError(e.to_string()))?;
        }

        let conn = Connection::open(&db_path).map_err(DbError::from)?;

        // WALモードを有効化（パフォーマンス向上）
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        // 外部キー制約を有効化
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        let db = LocalDB {
            conn: Arc::new(Mutex::new(conn)),
        };

        // マイグレーション実行
        db.run_migrations()?;

        Ok(db)
    }

    /// データベースファイルのパスを取得
    fn get_db_path(app_handle: &AppHandle) -> Result<PathBuf, DbError> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| DbError::PathError(e.to_string()))?;

        Ok(app_data_dir.join(DB_FILE_NAME))
    }

    /// マイグレーションを実行
    fn run_migrations(&self) -> Result<(), DbError> {
        let conn = self.conn.lock().map_err(|e| DbError::LockError(e.to_string()))?;

        // 現在のバージョンを取得
        let current_version = self.get_db_version(&conn)?;

        if current_version < schema::DB_VERSION {
            log::info!(
                "Running migrations: {} -> {}",
                current_version,
                schema::DB_VERSION
            );

            // 全スキーマを適用
            for schema_sql in schema::get_all_schemas() {
                conn.execute_batch(schema_sql)?;
            }

            // バージョンを更新
            self.set_db_version(&conn, schema::DB_VERSION)?;

            log::info!("Migrations completed successfully");
        }

        Ok(())
    }

    /// データベースバージョンを取得
    fn get_db_version(&self, conn: &Connection) -> Result<i32, DbError> {
        // メタデータテーブルが存在するか確認
        let table_exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='_metadata')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !table_exists {
            return Ok(0);
        }

        // バージョンを取得
        let version: Option<String> = conn
            .query_row(
                "SELECT value FROM _metadata WHERE key = 'db_version'",
                [],
                |row| row.get(0),
            )
            .ok();

        Ok(version
            .and_then(|v| v.parse::<i32>().ok())
            .unwrap_or(0))
    }

    /// データベースバージョンを設定
    fn set_db_version(&self, conn: &Connection, version: i32) -> Result<(), DbError> {
        conn.execute(
            "INSERT OR REPLACE INTO _metadata (key, value) VALUES ('db_version', ?1)",
            [version.to_string()],
        )?;
        Ok(())
    }

    /// 接続を取得
    pub fn connection(&self) -> Result<std::sync::MutexGuard<'_, Connection>, DbError> {
        self.conn
            .lock()
            .map_err(|e| DbError::LockError(e.to_string()))
    }
}

// ============================================================================
// Notes CRUD
// ============================================================================

impl LocalDB {
    /// 全ノートを取得
    pub fn get_notes_by_owner(&self, owner_id: &str) -> Result<Vec<LocalNote>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, owner_id, slug, title, description, visibility,
                   created_at, updated_at, is_trashed, trashed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM notes
            WHERE owner_id = ?1 AND sync_status != 'deleted'
            ORDER BY updated_at DESC
            "#,
        )?;

        let notes = stmt
            .query_map([owner_id], |row| LocalNote::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(notes)
    }

    /// IDでノートを取得
    pub fn get_note_by_id(&self, id: &str) -> Result<Option<LocalNote>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, owner_id, slug, title, description, visibility,
                   created_at, updated_at, is_trashed, trashed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM notes
            WHERE id = ?1
            "#,
        )?;

        let note = stmt
            .query_row([id], |row| LocalNote::from_row(row))
            .ok();

        Ok(note)
    }

    /// ノートを作成
    pub fn insert_note(&self, note: &LocalNote) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            r#"
            INSERT INTO notes (
                id, owner_id, slug, title, description, visibility,
                created_at, updated_at, is_trashed, trashed_at,
                sync_status, synced_at, local_updated_at, server_updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            "#,
            rusqlite::params![
                note.id,
                note.owner_id,
                note.slug,
                note.title,
                note.description,
                note.visibility,
                note.created_at,
                note.updated_at,
                note.is_trashed,
                note.trashed_at,
                note.sync_status,
                note.synced_at,
                note.local_updated_at,
                note.server_updated_at,
            ],
        )?;
        Ok(())
    }

    /// ノートを更新
    pub fn update_note(&self, id: &str, updates: NoteUpdate) -> Result<Option<LocalNote>, DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        // 現在のノートを取得
        let current = self.get_note_by_id(id)?;
        if current.is_none() {
            return Ok(None);
        }
        let current = current.unwrap();

        // 更新を適用
        let updated = LocalNote {
            title: updates.title.unwrap_or(current.title),
            description: updates.description.or(current.description),
            visibility: updates.visibility.unwrap_or(current.visibility),
            is_trashed: updates.is_trashed.unwrap_or(current.is_trashed),
            trashed_at: updates.trashed_at.or(current.trashed_at),
            updated_at: now.clone(),
            local_updated_at: now.clone(),
            sync_status: "pending".to_string(),
            ..current
        };

        conn.execute(
            r#"
            UPDATE notes SET
                title = ?1, description = ?2, visibility = ?3,
                is_trashed = ?4, trashed_at = ?5,
                updated_at = ?6, local_updated_at = ?7, sync_status = ?8
            WHERE id = ?9
            "#,
            rusqlite::params![
                updated.title,
                updated.description,
                updated.visibility,
                updated.is_trashed,
                updated.trashed_at,
                updated.updated_at,
                updated.local_updated_at,
                updated.sync_status,
                id,
            ],
        )?;

        Ok(Some(updated))
    }

    /// ノートを削除（論理削除）
    pub fn delete_note(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        let rows_affected = conn.execute(
            r#"
            UPDATE notes SET
                sync_status = 'deleted',
                local_updated_at = ?1
            WHERE id = ?2
            "#,
            rusqlite::params![now, id],
        )?;

        Ok(rows_affected > 0)
    }

    /// ノートを物理削除
    pub fn hard_delete_note(&self, id: &str) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute("DELETE FROM notes WHERE id = ?1", [id])?;
        Ok(())
    }

    /// 同期待ちのノートを取得
    pub fn get_pending_sync_notes(&self) -> Result<Vec<LocalNote>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, owner_id, slug, title, description, visibility,
                   created_at, updated_at, is_trashed, trashed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM notes
            WHERE sync_status = 'pending'
            "#,
        )?;

        let notes = stmt
            .query_map([], |row| LocalNote::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(notes)
    }

    /// 削除済みのノートを取得
    pub fn get_deleted_notes(&self) -> Result<Vec<LocalNote>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, owner_id, slug, title, description, visibility,
                   created_at, updated_at, is_trashed, trashed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM notes
            WHERE sync_status = 'deleted'
            "#,
        )?;

        let notes = stmt
            .query_map([], |row| LocalNote::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(notes)
    }

    /// ノートを同期済みにマーク
    pub fn mark_note_synced(&self, id: &str, server_updated_at: &str) -> Result<(), DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            r#"
            UPDATE notes SET
                sync_status = 'synced',
                synced_at = ?1,
                server_updated_at = ?2
            WHERE id = ?3
            "#,
            rusqlite::params![now, server_updated_at, id],
        )?;

        Ok(())
    }

    /// サーバーデータでノートを上書き
    pub fn overwrite_note_with_server(&self, note: &LocalNote) -> Result<(), DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            r#"
            INSERT OR REPLACE INTO notes (
                id, owner_id, slug, title, description, visibility,
                created_at, updated_at, is_trashed, trashed_at,
                sync_status, synced_at, local_updated_at, server_updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'synced', ?11, ?12, ?13)
            "#,
            rusqlite::params![
                note.id,
                note.owner_id,
                note.slug,
                note.title,
                note.description,
                note.visibility,
                note.created_at,
                note.updated_at,
                note.is_trashed,
                note.trashed_at,
                now,
                note.updated_at,
                note.updated_at,
            ],
        )?;

        Ok(())
    }
}

// ============================================================================
// Decks CRUD
// ============================================================================

impl LocalDB {
    /// 全デッキを取得
    pub fn get_decks_by_user(&self, user_id: &str) -> Result<Vec<LocalDeck>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, description, is_public,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM decks
            WHERE user_id = ?1 AND sync_status != 'deleted'
            ORDER BY updated_at DESC
            "#,
        )?;

        let decks = stmt
            .query_map([user_id], |row| LocalDeck::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(decks)
    }

    /// IDでデッキを取得
    pub fn get_deck_by_id(&self, id: &str) -> Result<Option<LocalDeck>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, description, is_public,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM decks
            WHERE id = ?1
            "#,
        )?;

        let deck = stmt
            .query_row([id], |row| LocalDeck::from_row(row))
            .ok();

        Ok(deck)
    }

    /// デッキを作成
    pub fn insert_deck(&self, deck: &LocalDeck) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            r#"
            INSERT INTO decks (
                id, user_id, title, description, is_public,
                created_at, updated_at,
                sync_status, synced_at, local_updated_at, server_updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            rusqlite::params![
                deck.id,
                deck.user_id,
                deck.title,
                deck.description,
                deck.is_public,
                deck.created_at,
                deck.updated_at,
                deck.sync_status,
                deck.synced_at,
                deck.local_updated_at,
                deck.server_updated_at,
            ],
        )?;
        Ok(())
    }

    /// デッキを削除（論理削除）
    pub fn delete_deck(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        let rows_affected = conn.execute(
            r#"
            UPDATE decks SET
                sync_status = 'deleted',
                local_updated_at = ?1
            WHERE id = ?2
            "#,
            rusqlite::params![now, id],
        )?;

        Ok(rows_affected > 0)
    }

    /// 同期待ちのデッキを取得
    pub fn get_pending_sync_decks(&self) -> Result<Vec<LocalDeck>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, description, is_public,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM decks
            WHERE sync_status = 'pending'
            "#,
        )?;

        let decks = stmt
            .query_map([], |row| LocalDeck::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(decks)
    }
}

// ============================================================================
// Cards CRUD
// ============================================================================

impl LocalDB {
    /// デッキの全カードを取得
    pub fn get_cards_by_deck(&self, deck_id: &str) -> Result<Vec<LocalCard>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, deck_id, user_id, front_content, back_content,
                   source_audio_url, source_ocr_image_url,
                   created_at, updated_at,
                   ease_factor, repetition_count, review_interval,
                   next_review_at, stability, difficulty, last_reviewed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM cards
            WHERE deck_id = ?1 AND sync_status != 'deleted'
            ORDER BY created_at DESC
            "#,
        )?;

        let cards = stmt
            .query_map([deck_id], |row| LocalCard::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(cards)
    }

    /// IDでカードを取得
    pub fn get_card_by_id(&self, id: &str) -> Result<Option<LocalCard>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, deck_id, user_id, front_content, back_content,
                   source_audio_url, source_ocr_image_url,
                   created_at, updated_at,
                   ease_factor, repetition_count, review_interval,
                   next_review_at, stability, difficulty, last_reviewed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM cards
            WHERE id = ?1
            "#,
        )?;

        let card = stmt
            .query_row([id], |row| LocalCard::from_row(row))
            .ok();

        Ok(card)
    }

    /// カードを作成
    pub fn insert_card(&self, card: &LocalCard) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            r#"
            INSERT INTO cards (
                id, deck_id, user_id, front_content, back_content,
                source_audio_url, source_ocr_image_url,
                created_at, updated_at,
                ease_factor, repetition_count, review_interval,
                next_review_at, stability, difficulty, last_reviewed_at,
                sync_status, synced_at, local_updated_at, server_updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)
            "#,
            rusqlite::params![
                card.id,
                card.deck_id,
                card.user_id,
                card.front_content,
                card.back_content,
                card.source_audio_url,
                card.source_ocr_image_url,
                card.created_at,
                card.updated_at,
                card.ease_factor,
                card.repetition_count,
                card.review_interval,
                card.next_review_at,
                card.stability,
                card.difficulty,
                card.last_reviewed_at,
                card.sync_status,
                card.synced_at,
                card.local_updated_at,
                card.server_updated_at,
            ],
        )?;
        Ok(())
    }

    /// カードを削除（論理削除）
    pub fn delete_card(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        let rows_affected = conn.execute(
            r#"
            UPDATE cards SET
                sync_status = 'deleted',
                local_updated_at = ?1
            WHERE id = ?2
            "#,
            rusqlite::params![now, id],
        )?;

        Ok(rows_affected > 0)
    }

    /// 期限切れカードを取得
    pub fn get_due_cards(&self, user_id: &str) -> Result<Vec<LocalCard>, DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, deck_id, user_id, front_content, back_content,
                   source_audio_url, source_ocr_image_url,
                   created_at, updated_at,
                   ease_factor, repetition_count, review_interval,
                   next_review_at, stability, difficulty, last_reviewed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM cards
            WHERE user_id = ?1 
              AND sync_status != 'deleted'
              AND next_review_at IS NOT NULL
              AND next_review_at <= ?2
            ORDER BY next_review_at ASC
            "#,
        )?;

        let cards = stmt
            .query_map([user_id, &now], |row| LocalCard::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(cards)
    }

    /// 同期待ちのカードを取得
    pub fn get_pending_sync_cards(&self) -> Result<Vec<LocalCard>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, deck_id, user_id, front_content, back_content,
                   source_audio_url, source_ocr_image_url,
                   created_at, updated_at,
                   ease_factor, repetition_count, review_interval,
                   next_review_at, stability, difficulty, last_reviewed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM cards
            WHERE sync_status = 'pending'
            "#,
        )?;

        let cards = stmt
            .query_map([], |row| LocalCard::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(cards)
    }
}

// ============================================================================
// Pages CRUD
// ============================================================================

impl LocalDB {
    /// ユーザーの全ページを取得
    pub fn get_pages_by_user(&self, user_id: &str) -> Result<Vec<LocalPage>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, note_id, title, thumbnail_url, is_public,
                   scrapbox_page_id, scrapbox_page_list_synced_at, scrapbox_page_content_synced_at,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM pages
            WHERE user_id = ?1 AND sync_status != 'deleted'
            ORDER BY updated_at DESC
            "#,
        )?;

        let pages = stmt
            .query_map([user_id], |row| LocalPage::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(pages)
    }

    /// ノートに紐づくページを取得
    pub fn get_pages_by_note(&self, note_id: &str) -> Result<Vec<LocalPage>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, note_id, title, thumbnail_url, is_public,
                   scrapbox_page_id, scrapbox_page_list_synced_at, scrapbox_page_content_synced_at,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM pages
            WHERE note_id = ?1 AND sync_status != 'deleted'
            ORDER BY updated_at DESC
            "#,
        )?;

        let pages = stmt
            .query_map([note_id], |row| LocalPage::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(pages)
    }

    /// IDでページを取得
    pub fn get_page_by_id(&self, id: &str) -> Result<Option<LocalPage>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, note_id, title, thumbnail_url, is_public,
                   scrapbox_page_id, scrapbox_page_list_synced_at, scrapbox_page_content_synced_at,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM pages
            WHERE id = ?1
            "#,
        )?;

        let page = stmt.query_row([id], |row| LocalPage::from_row(row)).ok();

        Ok(page)
    }

    /// ページを作成
    pub fn insert_page(&self, page: &LocalPage) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            r#"
            INSERT INTO pages (
                id, user_id, note_id, title, thumbnail_url, is_public,
                scrapbox_page_id, scrapbox_page_list_synced_at, scrapbox_page_content_synced_at,
                created_at, updated_at,
                sync_status, synced_at, local_updated_at, server_updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            "#,
            rusqlite::params![
                page.id,
                page.user_id,
                page.note_id,
                page.title,
                page.thumbnail_url,
                page.is_public,
                page.scrapbox_page_id,
                page.scrapbox_page_list_synced_at,
                page.scrapbox_page_content_synced_at,
                page.created_at,
                page.updated_at,
                page.sync_status,
                page.synced_at,
                page.local_updated_at,
                page.server_updated_at,
            ],
        )?;
        Ok(())
    }

    /// ページを更新
    pub fn update_page(&self, id: &str, updates: PageUpdate) -> Result<Option<LocalPage>, DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        let current = self.get_page_by_id(id)?;
        if current.is_none() {
            return Ok(None);
        }
        let current = current.unwrap();

        let updated = LocalPage {
            title: updates.title.unwrap_or(current.title),
            note_id: updates.note_id.unwrap_or(current.note_id),
            thumbnail_url: updates.thumbnail_url.unwrap_or(current.thumbnail_url),
            is_public: updates.is_public.unwrap_or(current.is_public),
            updated_at: now.clone(),
            local_updated_at: now.clone(),
            sync_status: "pending".to_string(),
            ..current
        };

        conn.execute(
            r#"
            UPDATE pages SET
                title = ?1, note_id = ?2, thumbnail_url = ?3, is_public = ?4,
                updated_at = ?5, local_updated_at = ?6, sync_status = ?7
            WHERE id = ?8
            "#,
            rusqlite::params![
                updated.title,
                updated.note_id,
                updated.thumbnail_url,
                updated.is_public,
                updated.updated_at,
                updated.local_updated_at,
                updated.sync_status,
                id,
            ],
        )?;

        Ok(Some(updated))
    }

    /// ページを削除（論理削除）
    pub fn delete_page(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        let rows_affected = conn.execute(
            r#"
            UPDATE pages SET
                sync_status = 'deleted',
                local_updated_at = ?1
            WHERE id = ?2
            "#,
            rusqlite::params![now, id],
        )?;

        Ok(rows_affected > 0)
    }

    /// 同期待ちのページを取得
    pub fn get_pending_sync_pages(&self) -> Result<Vec<LocalPage>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, note_id, title, thumbnail_url, is_public,
                   scrapbox_page_id, scrapbox_page_list_synced_at, scrapbox_page_content_synced_at,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM pages
            WHERE sync_status = 'pending'
            "#,
        )?;

        let pages = stmt
            .query_map([], |row| LocalPage::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(pages)
    }

    /// ページを同期済みにマーク
    pub fn mark_page_synced(&self, id: &str, server_updated_at: &str) -> Result<(), DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            r#"
            UPDATE pages SET
                sync_status = 'synced',
                synced_at = ?1,
                server_updated_at = ?2
            WHERE id = ?3
            "#,
            rusqlite::params![now, server_updated_at, id],
        )?;

        Ok(())
    }
}

// ============================================================================
// Study Goals CRUD
// ============================================================================

impl LocalDB {
    /// ユーザーの全学習目標を取得
    pub fn get_study_goals_by_user(&self, user_id: &str) -> Result<Vec<LocalStudyGoal>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, description,
                   created_at, updated_at, deadline, progress_rate, status, completed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM study_goals
            WHERE user_id = ?1 AND sync_status != 'deleted'
            ORDER BY updated_at DESC
            "#,
        )?;

        let goals = stmt
            .query_map([user_id], |row| LocalStudyGoal::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(goals)
    }

    /// IDで学習目標を取得
    pub fn get_study_goal_by_id(&self, id: &str) -> Result<Option<LocalStudyGoal>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, description,
                   created_at, updated_at, deadline, progress_rate, status, completed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM study_goals
            WHERE id = ?1
            "#,
        )?;

        let goal = stmt
            .query_row([id], |row| LocalStudyGoal::from_row(row))
            .ok();

        Ok(goal)
    }

    /// 学習目標を作成
    pub fn insert_study_goal(&self, goal: &LocalStudyGoal) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            r#"
            INSERT INTO study_goals (
                id, user_id, title, description,
                created_at, updated_at, deadline, progress_rate, status, completed_at,
                sync_status, synced_at, local_updated_at, server_updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
            "#,
            rusqlite::params![
                goal.id,
                goal.user_id,
                goal.title,
                goal.description,
                goal.created_at,
                goal.updated_at,
                goal.deadline,
                goal.progress_rate,
                goal.status,
                goal.completed_at,
                goal.sync_status,
                goal.synced_at,
                goal.local_updated_at,
                goal.server_updated_at,
            ],
        )?;
        Ok(())
    }

    /// 学習目標を削除（論理削除）
    pub fn delete_study_goal(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        let rows_affected = conn.execute(
            r#"
            UPDATE study_goals SET
                sync_status = 'deleted',
                local_updated_at = ?1
            WHERE id = ?2
            "#,
            rusqlite::params![now, id],
        )?;

        Ok(rows_affected > 0)
    }

    /// 同期待ちの学習目標を取得
    pub fn get_pending_sync_study_goals(&self) -> Result<Vec<LocalStudyGoal>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, description,
                   created_at, updated_at, deadline, progress_rate, status, completed_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM study_goals
            WHERE sync_status = 'pending'
            "#,
        )?;

        let goals = stmt
            .query_map([], |row| LocalStudyGoal::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(goals)
    }
}

// ============================================================================
// Learning Logs CRUD
// ============================================================================

impl LocalDB {
    /// ユーザーの学習ログを取得
    pub fn get_learning_logs_by_user(&self, user_id: &str) -> Result<Vec<LocalLearningLog>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, card_id, question_id, answered_at, is_correct,
                   user_answer, practice_mode, review_interval, next_review_at,
                   quality, response_time, effort_time, attempt_count,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM learning_logs
            WHERE user_id = ?1 AND sync_status != 'deleted'
            ORDER BY answered_at DESC
            "#,
        )?;

        let logs = stmt
            .query_map([user_id], |row| LocalLearningLog::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(logs)
    }

    /// カードの学習ログを取得
    pub fn get_learning_logs_by_card(&self, card_id: &str) -> Result<Vec<LocalLearningLog>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, card_id, question_id, answered_at, is_correct,
                   user_answer, practice_mode, review_interval, next_review_at,
                   quality, response_time, effort_time, attempt_count,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM learning_logs
            WHERE card_id = ?1 AND sync_status != 'deleted'
            ORDER BY answered_at DESC
            "#,
        )?;

        let logs = stmt
            .query_map([card_id], |row| LocalLearningLog::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(logs)
    }

    /// 学習ログを作成
    pub fn insert_learning_log(&self, log: &LocalLearningLog) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            r#"
            INSERT INTO learning_logs (
                id, user_id, card_id, question_id, answered_at, is_correct,
                user_answer, practice_mode, review_interval, next_review_at,
                quality, response_time, effort_time, attempt_count,
                sync_status, synced_at, local_updated_at, server_updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
            "#,
            rusqlite::params![
                log.id,
                log.user_id,
                log.card_id,
                log.question_id,
                log.answered_at,
                log.is_correct,
                log.user_answer,
                log.practice_mode,
                log.review_interval,
                log.next_review_at,
                log.quality,
                log.response_time,
                log.effort_time,
                log.attempt_count,
                log.sync_status,
                log.synced_at,
                log.local_updated_at,
                log.server_updated_at,
            ],
        )?;
        Ok(())
    }

    /// 同期待ちの学習ログを取得
    pub fn get_pending_sync_learning_logs(&self) -> Result<Vec<LocalLearningLog>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, card_id, question_id, answered_at, is_correct,
                   user_answer, practice_mode, review_interval, next_review_at,
                   quality, response_time, effort_time, attempt_count,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM learning_logs
            WHERE sync_status = 'pending'
            "#,
        )?;

        let logs = stmt
            .query_map([], |row| LocalLearningLog::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(logs)
    }
}

// ============================================================================
// Milestones CRUD
// ============================================================================

impl LocalDB {
    /// 学習目標に紐づくマイルストーンを取得
    pub fn get_milestones_by_goal(&self, goal_id: &str) -> Result<Vec<LocalMilestone>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, goal_id, title, description, due_date, is_completed,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM milestones
            WHERE goal_id = ?1 AND sync_status != 'deleted'
            ORDER BY due_date ASC
            "#,
        )?;

        let milestones = stmt
            .query_map([goal_id], |row| LocalMilestone::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(milestones)
    }

    /// IDでマイルストーンを取得
    pub fn get_milestone_by_id(&self, id: &str) -> Result<Option<LocalMilestone>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, goal_id, title, description, due_date, is_completed,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM milestones
            WHERE id = ?1
            "#,
        )?;

        let milestone = stmt
            .query_row([id], |row| LocalMilestone::from_row(row))
            .ok();

        Ok(milestone)
    }

    /// マイルストーンを作成
    pub fn insert_milestone(&self, milestone: &LocalMilestone) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            r#"
            INSERT INTO milestones (
                id, goal_id, title, description, due_date, is_completed,
                created_at, updated_at,
                sync_status, synced_at, local_updated_at, server_updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
            "#,
            rusqlite::params![
                milestone.id,
                milestone.goal_id,
                milestone.title,
                milestone.description,
                milestone.due_date,
                milestone.is_completed,
                milestone.created_at,
                milestone.updated_at,
                milestone.sync_status,
                milestone.synced_at,
                milestone.local_updated_at,
                milestone.server_updated_at,
            ],
        )?;
        Ok(())
    }

    /// マイルストーンを削除（論理削除）
    pub fn delete_milestone(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.connection()?;
        let now = chrono::Utc::now().to_rfc3339();

        let rows_affected = conn.execute(
            r#"
            UPDATE milestones SET
                sync_status = 'deleted',
                local_updated_at = ?1
            WHERE id = ?2
            "#,
            rusqlite::params![now, id],
        )?;

        Ok(rows_affected > 0)
    }

    /// 同期待ちのマイルストーンを取得
    pub fn get_pending_sync_milestones(&self) -> Result<Vec<LocalMilestone>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, goal_id, title, description, due_date, is_completed,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM milestones
            WHERE sync_status = 'pending'
            "#,
        )?;

        let milestones = stmt
            .query_map([], |row| LocalMilestone::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(milestones)
    }
}

// ============================================================================
// User Settings CRUD
// ============================================================================

impl LocalDB {
    /// ユーザー設定を取得
    pub fn get_user_settings(&self, user_id: &str) -> Result<Option<LocalUserSettings>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, theme, mode, locale, timezone, notifications,
                   items_per_page, play_help_video_audio,
                   cosense_sync_enabled, notion_sync_enabled, gyazo_sync_enabled, quizlet_sync_enabled,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM user_settings
            WHERE user_id = ?1
            "#,
        )?;

        let settings = stmt
            .query_row([user_id], |row| LocalUserSettings::from_row(row))
            .ok();

        Ok(settings)
    }

    /// ユーザー設定を作成または更新
    pub fn upsert_user_settings(&self, settings: &LocalUserSettings) -> Result<(), DbError> {
        let conn = self.connection()?;
        conn.execute(
            r#"
            INSERT OR REPLACE INTO user_settings (
                id, user_id, theme, mode, locale, timezone, notifications,
                items_per_page, play_help_video_audio,
                cosense_sync_enabled, notion_sync_enabled, gyazo_sync_enabled, quizlet_sync_enabled,
                created_at, updated_at,
                sync_status, synced_at, local_updated_at, server_updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
            "#,
            rusqlite::params![
                settings.id,
                settings.user_id,
                settings.theme,
                settings.mode,
                settings.locale,
                settings.timezone,
                settings.notifications,
                settings.items_per_page,
                settings.play_help_video_audio,
                settings.cosense_sync_enabled,
                settings.notion_sync_enabled,
                settings.gyazo_sync_enabled,
                settings.quizlet_sync_enabled,
                settings.created_at,
                settings.updated_at,
                settings.sync_status,
                settings.synced_at,
                settings.local_updated_at,
                settings.server_updated_at,
            ],
        )?;
        Ok(())
    }

    /// 同期待ちのユーザー設定を取得
    pub fn get_pending_sync_user_settings(&self) -> Result<Vec<LocalUserSettings>, DbError> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, theme, mode, locale, timezone, notifications,
                   items_per_page, play_help_video_audio,
                   cosense_sync_enabled, notion_sync_enabled, gyazo_sync_enabled, quizlet_sync_enabled,
                   created_at, updated_at,
                   sync_status, synced_at, local_updated_at, server_updated_at
            FROM user_settings
            WHERE sync_status = 'pending'
            "#,
        )?;

        let settings = stmt
            .query_map([], |row| LocalUserSettings::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(settings)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_test_db() -> (LocalDB, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");

        let conn = Connection::open(&db_path).unwrap();
        conn.execute_batch("PRAGMA journal_mode=WAL;").unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();

        // スキーマを適用
        for schema_sql in schema::get_all_schemas() {
            conn.execute_batch(schema_sql).unwrap();
        }

        let db = LocalDB {
            conn: Arc::new(Mutex::new(conn)),
        };

        (db, temp_dir)
    }

    #[test]
    fn test_insert_and_get_note() {
        let (db, _temp_dir) = setup_test_db();

        let note = LocalNote {
            id: "test-note-1".to_string(),
            owner_id: "test-user-1".to_string(),
            slug: "test-note".to_string(),
            title: "Test Note".to_string(),
            description: Some("Test description".to_string()),
            visibility: "private".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            is_trashed: false,
            trashed_at: None,
            sync_status: "pending".to_string(),
            synced_at: None,
            local_updated_at: chrono::Utc::now().to_rfc3339(),
            server_updated_at: None,
        };

        db.insert_note(&note).unwrap();

        let retrieved = db.get_note_by_id("test-note-1").unwrap();
        assert!(retrieved.is_some());
        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.id, "test-note-1");
        assert_eq!(retrieved.title, "Test Note");
    }

    #[test]
    fn test_get_notes_by_owner() {
        let (db, _temp_dir) = setup_test_db();

        let note1 = LocalNote {
            id: "note-1".to_string(),
            owner_id: "user-1".to_string(),
            slug: "note-1".to_string(),
            title: "Note 1".to_string(),
            description: None,
            visibility: "private".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            is_trashed: false,
            trashed_at: None,
            sync_status: "pending".to_string(),
            synced_at: None,
            local_updated_at: chrono::Utc::now().to_rfc3339(),
            server_updated_at: None,
        };

        let note2 = LocalNote {
            id: "note-2".to_string(),
            owner_id: "user-1".to_string(),
            slug: "note-2".to_string(),
            title: "Note 2".to_string(),
            ..note1.clone()
        };

        let note3 = LocalNote {
            id: "note-3".to_string(),
            owner_id: "user-2".to_string(),
            slug: "note-3".to_string(),
            title: "Note 3".to_string(),
            ..note1.clone()
        };

        db.insert_note(&note1).unwrap();
        db.insert_note(&note2).unwrap();
        db.insert_note(&note3).unwrap();

        let user1_notes = db.get_notes_by_owner("user-1").unwrap();
        assert_eq!(user1_notes.len(), 2);

        let user2_notes = db.get_notes_by_owner("user-2").unwrap();
        assert_eq!(user2_notes.len(), 1);
    }

    #[test]
    fn test_delete_note() {
        let (db, _temp_dir) = setup_test_db();

        let note = LocalNote {
            id: "test-note".to_string(),
            owner_id: "test-user".to_string(),
            slug: "test".to_string(),
            title: "Test".to_string(),
            description: None,
            visibility: "private".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            is_trashed: false,
            trashed_at: None,
            sync_status: "pending".to_string(),
            synced_at: None,
            local_updated_at: chrono::Utc::now().to_rfc3339(),
            server_updated_at: None,
        };

        db.insert_note(&note).unwrap();
        let result = db.delete_note("test-note").unwrap();
        assert!(result);

        // 削除後は通常の取得では見つからない
        let notes = db.get_notes_by_owner("test-user").unwrap();
        assert_eq!(notes.len(), 0);

        // 削除済みリストには存在する
        let deleted = db.get_deleted_notes().unwrap();
        assert_eq!(deleted.len(), 1);
        assert_eq!(deleted[0].sync_status, "deleted");
    }
}

