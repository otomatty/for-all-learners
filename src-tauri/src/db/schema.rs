//! SQLite スキーマ定義
//!
//! Tauri環境用のローカルデータベーススキーマ
//!
//! DEPENDENCY MAP:
//!
//! Parents (Files that import this module):
//!   └─ src-tauri/src/db/mod.rs
//!
//! Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
//! Issue: https://github.com/otomatty/for-all-learners/issues/191

/// データベースバージョン
pub const DB_VERSION: i32 = 1;

/// Notes テーブルスキーマ
pub const NOTES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'unlisted', 'invite', 'private')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_trashed INTEGER NOT NULL DEFAULT 0,
    trashed_at TEXT,
    
    -- 同期メタデータ
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'deleted')),
    synced_at TEXT,
    local_updated_at TEXT NOT NULL,
    server_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_sync_status ON notes(sync_status);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(local_updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_owner_slug ON notes(owner_id, slug);
"#;

/// Pages テーブルスキーマ
/// 注意: content_tiptap はリアルタイム同期（Yjs）のため、ここには含めない
pub const PAGES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    note_id TEXT,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    scrapbox_page_id TEXT,
    scrapbox_page_list_synced_at TEXT,
    scrapbox_page_content_synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    -- 同期メタデータ
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'deleted')),
    synced_at TEXT,
    local_updated_at TEXT NOT NULL,
    server_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_note ON pages(note_id);
CREATE INDEX IF NOT EXISTS idx_pages_sync_status ON pages(sync_status);
CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(local_updated_at);
"#;

/// Decks テーブルスキーマ
pub const DECKS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS decks (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    -- 同期メタデータ
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'deleted')),
    synced_at TEXT,
    local_updated_at TEXT NOT NULL,
    server_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_sync_status ON decks(sync_status);
CREATE INDEX IF NOT EXISTS idx_decks_updated ON decks(local_updated_at);
"#;

/// Cards テーブルスキーマ
pub const CARDS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY NOT NULL,
    deck_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    source_audio_url TEXT,
    source_ocr_image_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    -- FSRS（間隔反復アルゴリズム）関連
    ease_factor REAL NOT NULL DEFAULT 2.5,
    repetition_count INTEGER NOT NULL DEFAULT 0,
    review_interval INTEGER NOT NULL DEFAULT 0,
    next_review_at TEXT,
    stability REAL NOT NULL DEFAULT 0.0,
    difficulty REAL NOT NULL DEFAULT 1.0,
    last_reviewed_at TEXT,
    
    -- 同期メタデータ
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'deleted')),
    synced_at TEXT,
    local_updated_at TEXT NOT NULL,
    server_updated_at TEXT,
    
    FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_sync_status ON cards(sync_status);
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review_at);
CREATE INDEX IF NOT EXISTS idx_cards_updated ON cards(local_updated_at);
"#;

/// Study Goals テーブルスキーマ
pub const STUDY_GOALS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS study_goals (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deadline TEXT,
    progress_rate INTEGER NOT NULL DEFAULT 0 CHECK (progress_rate BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    completed_at TEXT,
    
    -- 同期メタデータ
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'deleted')),
    synced_at TEXT,
    local_updated_at TEXT NOT NULL,
    server_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_study_goals_user ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_sync_status ON study_goals(sync_status);
CREATE INDEX IF NOT EXISTS idx_study_goals_status ON study_goals(status);
"#;

/// Learning Logs テーブルスキーマ
pub const LEARNING_LOGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS learning_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    question_id TEXT,
    answered_at TEXT NOT NULL,
    is_correct INTEGER NOT NULL,
    user_answer TEXT,
    practice_mode TEXT NOT NULL CHECK (practice_mode IN ('flashcard', 'quiz', 'typing', 'listening', 'reading')),
    review_interval INTEGER,
    next_review_at TEXT,
    quality INTEGER NOT NULL DEFAULT 0 CHECK (quality BETWEEN 0 AND 5),
    response_time INTEGER NOT NULL DEFAULT 0,
    effort_time INTEGER NOT NULL DEFAULT 0,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    
    -- 同期メタデータ
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'deleted')),
    synced_at TEXT,
    local_updated_at TEXT NOT NULL,
    server_updated_at TEXT,
    
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_logs_user ON learning_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_card ON learning_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_learning_logs_sync_status ON learning_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_learning_logs_answered ON learning_logs(answered_at);
"#;

/// Milestones テーブルスキーマ
pub const MILESTONES_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    -- 同期メタデータ
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'deleted')),
    synced_at TEXT,
    local_updated_at TEXT NOT NULL,
    server_updated_at TEXT,
    
    FOREIGN KEY (goal_id) REFERENCES study_goals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_milestones_goal ON milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_milestones_sync_status ON milestones(sync_status);
"#;

/// User Settings テーブルスキーマ
pub const USER_SETTINGS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL UNIQUE,
    theme TEXT NOT NULL DEFAULT 'ocean' CHECK (theme IN ('ocean', 'forest', 'sunset', 'night-sky', 'desert')),
    mode TEXT NOT NULL DEFAULT 'light' CHECK (mode IN ('light', 'dark')),
    locale TEXT NOT NULL DEFAULT 'en',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    notifications TEXT NOT NULL DEFAULT '{}',
    items_per_page INTEGER NOT NULL DEFAULT 20,
    play_help_video_audio INTEGER NOT NULL DEFAULT 0,
    cosense_sync_enabled INTEGER NOT NULL DEFAULT 0,
    notion_sync_enabled INTEGER NOT NULL DEFAULT 0,
    gyazo_sync_enabled INTEGER NOT NULL DEFAULT 0,
    quizlet_sync_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    -- 同期メタデータ
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'deleted')),
    synced_at TEXT,
    local_updated_at TEXT NOT NULL,
    server_updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_sync_status ON user_settings(sync_status);
"#;

/// メタデータテーブル（DBバージョン管理用）
pub const METADATA_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS _metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);
"#;

/// 全テーブルのスキーマを配列として取得
pub fn get_all_schemas() -> Vec<&'static str> {
    vec![
        METADATA_TABLE,
        NOTES_TABLE,
        PAGES_TABLE,
        DECKS_TABLE,
        CARDS_TABLE,
        STUDY_GOALS_TABLE,
        LEARNING_LOGS_TABLE,
        MILESTONES_TABLE,
        USER_SETTINGS_TABLE,
    ]
}

/// テーブル名の一覧
pub const TABLE_NAMES: [&str; 8] = [
    "notes",
    "pages",
    "decks",
    "cards",
    "study_goals",
    "learning_logs",
    "milestones",
    "user_settings",
];

