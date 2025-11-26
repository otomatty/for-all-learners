//! データベースエラー型
//!
//! DEPENDENCY MAP:
//!
//! Parents (Files that import this module):
//!   └─ src-tauri/src/db/mod.rs

use thiserror::Error;

/// データベースエラー
#[derive(Debug, Error)]
pub enum DbError {
    /// SQLiteエラー
    #[error("SQLite error: {0}")]
    SqliteError(#[from] rusqlite::Error),

    /// ファイルシステムエラー
    #[error("IO error: {0}")]
    IoError(String),

    /// パスエラー
    #[error("Path error: {0}")]
    PathError(String),

    /// ロックエラー
    #[error("Lock error: {0}")]
    LockError(String),

    /// シリアライズエラー
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// データが見つからない
    #[error("Not found: {0}")]
    NotFound(String),

    /// バリデーションエラー
    #[error("Validation error: {0}")]
    ValidationError(String),
}

impl From<serde_json::Error> for DbError {
    fn from(err: serde_json::Error) -> Self {
        DbError::SerializationError(err.to_string())
    }
}

