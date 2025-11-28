/**
 * ローカルDB同期用型定義
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ lib/db/indexeddb-client.ts
 *   ├─ lib/db/hybrid-client.ts
 *   └─ src-tauri/src/db/schema.rs (参照)
 *
 * Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/190
 */

// ============================================================================
// 同期メタデータ
// ============================================================================

/**
 * 同期ステータス
 * - pending: ローカルで変更されたが、サーバーに同期されていない
 * - synced: サーバーと同期済み
 * - conflict: サーバーとローカルで競合が発生
 * - deleted: 論理削除（サーバー同期後に物理削除）
 */
export type SyncStatus = "pending" | "synced" | "conflict" | "deleted";

/**
 * 同期可能なエンティティの共通メタデータ
 */
export interface SyncableEntity {
	/** 同期ステータス */
	sync_status: SyncStatus;
	/** 最後に同期した日時 */
	synced_at: string | null;
	/** ローカルでの最終更新日時 */
	local_updated_at: string;
	/** サーバーでの最終更新日時 */
	server_updated_at: string | null;
}

// ============================================================================
// Notes（ノート）
// ============================================================================

/**
 * ノートの公開設定
 */
export type NoteVisibility = "public" | "unlisted" | "invite" | "private";

/**
 * ローカルDBに保存するノートの型
 */
export interface LocalNote extends SyncableEntity {
	/** ノートID（UUID） */
	id: string;
	/** オーナーのユーザーID */
	owner_id: string;
	/** ノートのスラッグ（URL用） */
	slug: string;
	/** ノートのタイトル */
	title: string;
	/** ノートの説明 */
	description: string | null;
	/** 公開設定 */
	visibility: NoteVisibility;
	/** 作成日時 */
	created_at: string;
	/** 更新日時 */
	updated_at: string;
	/** ページ数 */
	page_count: number;
	/** 参加者数 */
	participant_count: number;
	/** デフォルトノートかどうか */
	is_default_note: boolean | null;
}

/**
 * ノート作成時のペイロード
 */
export interface CreateNotePayload {
	title: string;
	slug: string;
	description?: string | null;
	visibility?: NoteVisibility;
}

/**
 * ノート更新時のペイロード
 */
export interface UpdateNotePayload {
	title?: string;
	description?: string | null;
	visibility?: NoteVisibility;
}

// ============================================================================
// Pages（ページ）
// ============================================================================

/**
 * ローカルDBに保存するページの型
 * 注意: content_tiptap はリアルタイム同期（Yjs）のため、ここには含めない
 */
export interface LocalPage extends SyncableEntity {
	/** ページID（UUID） */
	id: string;
	/** オーナーのユーザーID */
	user_id: string;
	/** 紐付けられているノートID */
	note_id: string | null;
	/** ページのタイトル */
	title: string;
	/** サムネイルURL */
	thumbnail_url: string | null;
	/** 公開設定 */
	is_public: boolean;
	/** Cosense（Scrapbox）ページID */
	scrapbox_page_id: string | null;
	/** Cosenseページリスト同期日時 */
	scrapbox_page_list_synced_at: string | null;
	/** Cosenseページコンテンツ同期日時 */
	scrapbox_page_content_synced_at: string | null;
	/** 作成日時 */
	created_at: string;
	/** 更新日時 */
	updated_at: string;
}

/**
 * ページ作成時のペイロード
 */
export interface CreatePagePayload {
	title: string;
	note_id?: string | null;
	is_public?: boolean;
	thumbnail_url?: string | null;
}

/**
 * ページ更新時のペイロード
 */
export interface UpdatePagePayload {
	title?: string;
	note_id?: string | null;
	is_public?: boolean;
	thumbnail_url?: string | null;
}

// ============================================================================
// Decks（デッキ）
// ============================================================================

/**
 * ローカルDBに保存するデッキの型
 */
export interface LocalDeck extends SyncableEntity {
	/** デッキID（UUID） */
	id: string;
	/** オーナーのユーザーID */
	user_id: string;
	/** デッキのタイトル */
	title: string;
	/** デッキの説明 */
	description: string | null;
	/** 公開設定 */
	is_public: boolean;
	/** 作成日時 */
	created_at: string;
	/** 更新日時 */
	updated_at: string;
}

/**
 * デッキ作成時のペイロード
 */
export interface CreateDeckPayload {
	title: string;
	description?: string | null;
	is_public?: boolean;
}

/**
 * デッキ更新時のペイロード
 */
export interface UpdateDeckPayload {
	title?: string;
	description?: string | null;
	is_public?: boolean;
}

// ============================================================================
// Cards（カード）
// ============================================================================

/**
 * Tiptapコンテンツの型
 */
export interface TiptapContent {
	type: "doc";
	content: unknown[];
}

/**
 * ローカルDBに保存するカードの型
 */
export interface LocalCard extends SyncableEntity {
	/** カードID（UUID） */
	id: string;
	/** 所属するデッキID */
	deck_id: string;
	/** オーナーのユーザーID */
	user_id: string;
	/** 表面のコンテンツ（Tiptap JSON） */
	front_content: TiptapContent;
	/** 裏面のコンテンツ（Tiptap JSON） */
	back_content: TiptapContent;
	/** 音声ソースURL */
	source_audio_url: string | null;
	/** OCR画像URL */
	source_ocr_image_url: string | null;
	/** 作成日時 */
	created_at: string;
	/** 更新日時 */
	updated_at: string;
	// --- FSRS（間隔反復アルゴリズム）関連 ---
	/** 難易度係数 */
	ease_factor: number;
	/** 反復回数 */
	repetition_count: number;
	/** 復習間隔（日数） */
	review_interval: number;
	/** 次回復習日時 */
	next_review_at: string | null;
	/** 安定性 */
	stability: number;
	/** 難易度 */
	difficulty: number;
	/** 最後にレビューした日時 */
	last_reviewed_at: string | null;
}

/**
 * カード作成時のペイロード
 */
export interface CreateCardPayload {
	deck_id: string;
	front_content: TiptapContent;
	back_content: TiptapContent;
	source_audio_url?: string | null;
	source_ocr_image_url?: string | null;
}

/**
 * カード更新時のペイロード
 */
export interface UpdateCardPayload {
	front_content?: TiptapContent;
	back_content?: TiptapContent;
	source_audio_url?: string | null;
	source_ocr_image_url?: string | null;
	ease_factor?: number;
	repetition_count?: number;
	review_interval?: number;
	next_review_at?: string | null;
	stability?: number;
	difficulty?: number;
	last_reviewed_at?: string | null;
}

// ============================================================================
// Study Goals（学習目標）
// ============================================================================

/**
 * 学習目標のステータス
 */
export type StudyGoalStatus = "not_started" | "in_progress" | "completed";

/**
 * ローカルDBに保存する学習目標の型
 */
export interface LocalStudyGoal extends SyncableEntity {
	/** 学習目標ID（UUID） */
	id: string;
	/** オーナーのユーザーID */
	user_id: string;
	/** タイトル */
	title: string;
	/** 説明 */
	description: string | null;
	/** 作成日時 */
	created_at: string;
	/** 更新日時 */
	updated_at: string;
	/** 期限 */
	deadline: string | null;
	/** 進捗率（0-100） */
	progress_rate: number;
	/** ステータス */
	status: StudyGoalStatus;
	/** 完了日時 */
	completed_at: string | null;
}

/**
 * 学習目標作成時のペイロード
 */
export interface CreateStudyGoalPayload {
	title: string;
	description?: string | null;
	deadline?: string | null;
}

/**
 * 学習目標更新時のペイロード
 */
export interface UpdateStudyGoalPayload {
	title?: string;
	description?: string | null;
	deadline?: string | null;
	progress_rate?: number;
	status?: StudyGoalStatus;
	completed_at?: string | null;
}

// ============================================================================
// Learning Logs（学習ログ）
// ============================================================================

/**
 * 学習モード
 */
export type PracticeMode =
	| "flashcard"
	| "quiz"
	| "typing"
	| "listening"
	| "reading";

/**
 * ローカルDBに保存する学習ログの型
 */
export interface LocalLearningLog extends SyncableEntity {
	/** 学習ログID（UUID） */
	id: string;
	/** ユーザーID */
	user_id: string;
	/** カードID */
	card_id: string;
	/** 問題ID（オプション） */
	question_id: string | null;
	/** 回答日時 */
	answered_at: string;
	/** 正解したか */
	is_correct: boolean;
	/** ユーザーの回答 */
	user_answer: string | null;
	/** 学習モード */
	practice_mode: PracticeMode;
	/** 復習間隔 */
	review_interval: number | null;
	/** 次回復習日時 */
	next_review_at: string | null;
	/** 回答品質（0-5） */
	quality: number;
	/** 回答時間（ミリ秒） */
	response_time: number;
	/** 学習時間（秒） */
	effort_time: number;
	/** 試行回数 */
	attempt_count: number;
}

/**
 * 学習ログ作成時のペイロード
 */
export interface CreateLearningLogPayload {
	card_id: string;
	question_id?: string | null;
	is_correct: boolean;
	user_answer?: string | null;
	practice_mode: PracticeMode;
	quality: number;
	response_time: number;
	effort_time?: number;
}

// ============================================================================
// Milestones（マイルストーン - ロードマップ用）
// ============================================================================

/**
 * マイルストーンのステータス
 */
export type MilestoneStatus =
	| "planning"
	| "in-progress"
	| "launched"
	| "on-hold"
	| "completed";

/**
 * 関連リンク
 */
export interface MilestoneRelatedLink {
	title: string;
	url: string;
}

/**
 * ローカルDBに保存するマイルストーンの型
 * 注意: これはロードマップ用のマイルストーンです
 */
export interface LocalMilestone extends SyncableEntity {
	/** マイルストーンID（UUID） */
	id: string;
	/** マイルストーン識別子（例: "v1-mvp"） */
	milestone_id: string;
	/** 時間枠 */
	timeframe: string;
	/** タイトル */
	title: string;
	/** 説明 */
	description: string | null;
	/** ステータス */
	status: MilestoneStatus;
	/** 進捗（0-100） */
	progress: number | null;
	/** 表示順序 */
	sort_order: number;
	/** 作成日時 */
	created_at: string;
	/** 更新日時 */
	updated_at: string;
	/** 画像URL */
	image_url: string | null;
	/** 機能リスト */
	features: string[] | null;
	/** 関連リンク */
	related_links: MilestoneRelatedLink[] | null;
}

/**
 * マイルストーン作成時のペイロード
 */
export interface CreateMilestonePayload {
	milestone_id: string;
	timeframe: string;
	title: string;
	description?: string | null;
	status?: MilestoneStatus;
	progress?: number | null;
	sort_order?: number;
}

/**
 * マイルストーン更新時のペイロード
 */
export interface UpdateMilestonePayload {
	title?: string;
	description?: string | null;
	status?: MilestoneStatus;
	progress?: number | null;
	sort_order?: number;
	image_url?: string | null;
	features?: string[] | null;
	related_links?: MilestoneRelatedLink[] | null;
}

// ============================================================================
// User Settings（ユーザー設定）
// ============================================================================

/**
 * テーマ
 */
export type ThemeName = "ocean" | "forest" | "sunset" | "night-sky" | "desert";

/**
 * モード
 */
export type ThemeMode = "light" | "dark";

/**
 * 通知設定
 */
export interface NotificationSettings {
	email?: boolean;
	push?: boolean;
	reminder?: boolean;
}

/**
 * ローカルDBに保存するユーザー設定の型
 */
export interface LocalUserSettings extends SyncableEntity {
	/** 設定ID（UUID） */
	id: string;
	/** ユーザーID */
	user_id: string;
	/** テーマ */
	theme: ThemeName;
	/** モード */
	mode: ThemeMode;
	/** ロケール */
	locale: string;
	/** タイムゾーン */
	timezone: string;
	/** 通知設定 */
	notifications: NotificationSettings;
	/** 1ページあたりの表示件数 */
	items_per_page: number;
	/** ヘルプ動画の音声を再生するか */
	play_help_video_audio: boolean;
	/** Cosense同期が有効か */
	cosense_sync_enabled: boolean;
	/** Notion同期が有効か */
	notion_sync_enabled: boolean;
	/** Gyazo同期が有効か */
	gyazo_sync_enabled: boolean;
	/** Quizlet同期が有効か */
	quizlet_sync_enabled: boolean;
	/** 作成日時 */
	created_at: string;
	/** 更新日時 */
	updated_at: string;
}

/**
 * ユーザー設定更新時のペイロード
 */
export interface UpdateUserSettingsPayload {
	theme?: ThemeName;
	mode?: ThemeMode;
	locale?: string;
	timezone?: string;
	notifications?: NotificationSettings;
	items_per_page?: number;
	play_help_video_audio?: boolean;
	cosense_sync_enabled?: boolean;
	notion_sync_enabled?: boolean;
	gyazo_sync_enabled?: boolean;
	quizlet_sync_enabled?: boolean;
}

// ============================================================================
// データベーススキーマ定義（IndexedDB用）
// ============================================================================

import type { DBSchema } from "idb";

/**
 * IndexedDBのデータベーススキーマ
 */
export interface LocalAppDatabase extends DBSchema {
	notes: {
		key: string;
		value: LocalNote;
		indexes: {
			"by-owner": string;
			"by-sync-status": SyncStatus;
			"by-updated": string;
		};
	};
	pages: {
		key: string;
		value: LocalPage;
		indexes: {
			"by-user": string;
			"by-note": string;
			"by-sync-status": SyncStatus;
			"by-updated": string;
		};
	};
	decks: {
		key: string;
		value: LocalDeck;
		indexes: {
			"by-user": string;
			"by-sync-status": SyncStatus;
			"by-updated": string;
		};
	};
	cards: {
		key: string;
		value: LocalCard;
		indexes: {
			"by-deck": string;
			"by-user": string;
			"by-sync-status": SyncStatus;
			"by-next-review": string;
			"by-updated": string;
		};
	};
	study_goals: {
		key: string;
		value: LocalStudyGoal;
		indexes: {
			"by-user": string;
			"by-sync-status": SyncStatus;
			"by-status": StudyGoalStatus;
		};
	};
	learning_logs: {
		key: string;
		value: LocalLearningLog;
		indexes: {
			"by-user": string;
			"by-card": string;
			"by-sync-status": SyncStatus;
			"by-answered": string;
		};
	};
	milestones: {
		key: string;
		value: LocalMilestone;
		indexes: {
			"by-milestone-id": string;
			"by-sync-status": SyncStatus;
		};
	};
	user_settings: {
		key: string;
		value: LocalUserSettings;
		indexes: {
			"by-user": string;
			"by-sync-status": SyncStatus;
		};
	};
}

/**
 * データベース名
 */
export const DB_NAME = "for-all-learners-local";

/**
 * データベースバージョン
 */
export const DB_VERSION = 1;

// ============================================================================
// ユーティリティ型
// ============================================================================

/**
 * 同期待ちデータの型
 */
export interface PendingSyncData<T extends SyncableEntity> {
	entity: T;
	tableName: keyof LocalAppDatabase;
}

/**
 * 同期結果の型
 */
export interface SyncResult {
	success: boolean;
	synced: number;
	failed: number;
	conflicts: number;
	errors: string[];
}

/**
 * 競合データの型
 */
export interface ConflictData<T extends SyncableEntity> {
	local: T;
	server: T;
	tableName: keyof LocalAppDatabase;
}
