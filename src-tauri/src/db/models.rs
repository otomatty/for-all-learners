//! データモデル定義
//!
//! ローカルDBに保存するデータの構造体を定義
//!
//! DEPENDENCY MAP:
//!
//! Parents (Files that import this module):
//!   └─ src-tauri/src/db/mod.rs

use rusqlite::Row;
use serde::{Deserialize, Serialize};

// ============================================================================
// Notes
// ============================================================================

/// ローカルノート
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalNote {
    pub id: String,
    pub owner_id: String,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub visibility: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_trashed: bool,
    pub trashed_at: Option<String>,
    pub sync_status: String,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
    pub server_updated_at: Option<String>,
}

impl LocalNote {
    /// SQLite行からLocalNoteを生成
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            owner_id: row.get(1)?,
            slug: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            visibility: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            is_trashed: row.get::<_, i32>(8)? != 0,
            trashed_at: row.get(9)?,
            sync_status: row.get(10)?,
            synced_at: row.get(11)?,
            local_updated_at: row.get(12)?,
            server_updated_at: row.get(13)?,
        })
    }
}

/// ノート更新用構造体
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct NoteUpdate {
    pub title: Option<String>,
    pub description: Option<String>,
    pub visibility: Option<String>,
    pub is_trashed: Option<bool>,
    pub trashed_at: Option<String>,
}

// ============================================================================
// Pages
// ============================================================================

/// ローカルページ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalPage {
    pub id: String,
    pub user_id: String,
    pub note_id: Option<String>,
    pub title: String,
    pub thumbnail_url: Option<String>,
    pub is_public: bool,
    pub scrapbox_page_id: Option<String>,
    pub scrapbox_page_list_synced_at: Option<String>,
    pub scrapbox_page_content_synced_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
    pub server_updated_at: Option<String>,
}

impl LocalPage {
    /// SQLite行からLocalPageを生成
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            user_id: row.get(1)?,
            note_id: row.get(2)?,
            title: row.get(3)?,
            thumbnail_url: row.get(4)?,
            is_public: row.get::<_, i32>(5)? != 0,
            scrapbox_page_id: row.get(6)?,
            scrapbox_page_list_synced_at: row.get(7)?,
            scrapbox_page_content_synced_at: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
            sync_status: row.get(11)?,
            synced_at: row.get(12)?,
            local_updated_at: row.get(13)?,
            server_updated_at: row.get(14)?,
        })
    }
}

/// ページ更新用構造体
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PageUpdate {
    pub title: Option<String>,
    pub note_id: Option<Option<String>>,
    pub thumbnail_url: Option<Option<String>>,
    pub is_public: Option<bool>,
}

// ============================================================================
// Decks
// ============================================================================

/// ローカルデッキ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalDeck {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub description: Option<String>,
    pub is_public: bool,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
    pub server_updated_at: Option<String>,
}

impl LocalDeck {
    /// SQLite行からLocalDeckを生成
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            user_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            is_public: row.get::<_, i32>(4)? != 0,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            sync_status: row.get(7)?,
            synced_at: row.get(8)?,
            local_updated_at: row.get(9)?,
            server_updated_at: row.get(10)?,
        })
    }
}

/// デッキ更新用構造体
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DeckUpdate {
    pub title: Option<String>,
    pub description: Option<Option<String>>,
    pub is_public: Option<bool>,
}

// ============================================================================
// Cards
// ============================================================================

/// ローカルカード
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalCard {
    pub id: String,
    pub deck_id: String,
    pub user_id: String,
    pub front_content: String,
    pub back_content: String,
    pub source_audio_url: Option<String>,
    pub source_ocr_image_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub ease_factor: f64,
    pub repetition_count: i32,
    pub review_interval: i32,
    pub next_review_at: Option<String>,
    pub stability: f64,
    pub difficulty: f64,
    pub last_reviewed_at: Option<String>,
    pub sync_status: String,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
    pub server_updated_at: Option<String>,
}

impl LocalCard {
    /// SQLite行からLocalCardを生成
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            deck_id: row.get(1)?,
            user_id: row.get(2)?,
            front_content: row.get(3)?,
            back_content: row.get(4)?,
            source_audio_url: row.get(5)?,
            source_ocr_image_url: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
            ease_factor: row.get(9)?,
            repetition_count: row.get(10)?,
            review_interval: row.get(11)?,
            next_review_at: row.get(12)?,
            stability: row.get(13)?,
            difficulty: row.get(14)?,
            last_reviewed_at: row.get(15)?,
            sync_status: row.get(16)?,
            synced_at: row.get(17)?,
            local_updated_at: row.get(18)?,
            server_updated_at: row.get(19)?,
        })
    }
}

/// カード更新用構造体
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CardUpdate {
    pub front_content: Option<String>,
    pub back_content: Option<String>,
    pub source_audio_url: Option<Option<String>>,
    pub source_ocr_image_url: Option<Option<String>>,
    pub ease_factor: Option<f64>,
    pub repetition_count: Option<i32>,
    pub review_interval: Option<i32>,
    pub next_review_at: Option<Option<String>>,
    pub stability: Option<f64>,
    pub difficulty: Option<f64>,
    pub last_reviewed_at: Option<Option<String>>,
}

// ============================================================================
// Study Goals
// ============================================================================

/// ローカル学習目標
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalStudyGoal {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub deadline: Option<String>,
    pub progress_rate: i32,
    pub status: String,
    pub completed_at: Option<String>,
    pub sync_status: String,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
    pub server_updated_at: Option<String>,
}

impl LocalStudyGoal {
    /// SQLite行からLocalStudyGoalを生成
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            user_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            deadline: row.get(6)?,
            progress_rate: row.get(7)?,
            status: row.get(8)?,
            completed_at: row.get(9)?,
            sync_status: row.get(10)?,
            synced_at: row.get(11)?,
            local_updated_at: row.get(12)?,
            server_updated_at: row.get(13)?,
        })
    }
}

// ============================================================================
// Learning Logs
// ============================================================================

/// ローカル学習ログ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalLearningLog {
    pub id: String,
    pub user_id: String,
    pub card_id: String,
    pub question_id: Option<String>,
    pub answered_at: String,
    pub is_correct: bool,
    pub user_answer: Option<String>,
    pub practice_mode: String,
    pub review_interval: Option<i32>,
    pub next_review_at: Option<String>,
    pub quality: i32,
    pub response_time: i32,
    pub effort_time: i32,
    pub attempt_count: i32,
    pub sync_status: String,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
    pub server_updated_at: Option<String>,
}

impl LocalLearningLog {
    /// SQLite行からLocalLearningLogを生成
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            user_id: row.get(1)?,
            card_id: row.get(2)?,
            question_id: row.get(3)?,
            answered_at: row.get(4)?,
            is_correct: row.get::<_, i32>(5)? != 0,
            user_answer: row.get(6)?,
            practice_mode: row.get(7)?,
            review_interval: row.get(8)?,
            next_review_at: row.get(9)?,
            quality: row.get(10)?,
            response_time: row.get(11)?,
            effort_time: row.get(12)?,
            attempt_count: row.get(13)?,
            sync_status: row.get(14)?,
            synced_at: row.get(15)?,
            local_updated_at: row.get(16)?,
            server_updated_at: row.get(17)?,
        })
    }
}

// ============================================================================
// Milestones
// ============================================================================

/// ローカルマイルストーン
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalMilestone {
    pub id: String,
    pub goal_id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: Option<String>,
    pub is_completed: bool,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
    pub server_updated_at: Option<String>,
}

impl LocalMilestone {
    /// SQLite行からLocalMilestoneを生成
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            goal_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            due_date: row.get(4)?,
            is_completed: row.get::<_, i32>(5)? != 0,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            sync_status: row.get(8)?,
            synced_at: row.get(9)?,
            local_updated_at: row.get(10)?,
            server_updated_at: row.get(11)?,
        })
    }
}

// ============================================================================
// User Settings
// ============================================================================

/// ローカルユーザー設定
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalUserSettings {
    pub id: String,
    pub user_id: String,
    pub theme: String,
    pub mode: String,
    pub locale: String,
    pub timezone: String,
    pub notifications: String,
    pub items_per_page: i32,
    pub play_help_video_audio: bool,
    pub cosense_sync_enabled: bool,
    pub notion_sync_enabled: bool,
    pub gyazo_sync_enabled: bool,
    pub quizlet_sync_enabled: bool,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub synced_at: Option<String>,
    pub local_updated_at: String,
    pub server_updated_at: Option<String>,
}

impl LocalUserSettings {
    /// SQLite行からLocalUserSettingsを生成
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            user_id: row.get(1)?,
            theme: row.get(2)?,
            mode: row.get(3)?,
            locale: row.get(4)?,
            timezone: row.get(5)?,
            notifications: row.get(6)?,
            items_per_page: row.get(7)?,
            play_help_video_audio: row.get::<_, i32>(8)? != 0,
            cosense_sync_enabled: row.get::<_, i32>(9)? != 0,
            notion_sync_enabled: row.get::<_, i32>(10)? != 0,
            gyazo_sync_enabled: row.get::<_, i32>(11)? != 0,
            quizlet_sync_enabled: row.get::<_, i32>(12)? != 0,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
            sync_status: row.get(15)?,
            synced_at: row.get(16)?,
            local_updated_at: row.get(17)?,
            server_updated_at: row.get(18)?,
        })
    }
}

