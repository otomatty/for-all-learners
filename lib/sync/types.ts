/**
 * 同期機能の型定義
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ lib/sync/sync-manager.ts
 *   ├─ lib/sync/conflict-resolver.ts
 *   ├─ lib/sync/sync-queue.ts
 *   └─ lib/sync/sync-triggers.ts
 *
 * Dependencies:
 *   └─ lib/db/types.ts
 *
 * Spec: lib/sync/sync.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/193
 */

import type {
	LocalAppDatabase,
	LocalCard,
	LocalDeck,
	LocalLearningLog,
	LocalMilestone,
	LocalNote,
	LocalPage,
	LocalStudyGoal,
	LocalUserSettings,
	SyncableEntity,
} from "@/lib/db/types";

// ============================================================================
// 同期結果
// ============================================================================

/**
 * 同期結果
 */
export interface SyncResult {
	/** 同期が成功したか */
	success: boolean;
	/** プッシュした件数 */
	pushed: number;
	/** プルした件数 */
	pulled: number;
	/** 競合解決した件数 */
	conflicts: number;
	/** エラーメッセージ */
	errors: string[];
	/** 同期完了日時 */
	completedAt: string;
}

/**
 * プッシュ結果
 */
export interface PushResult {
	/** プッシュ成功件数 */
	count: number;
	/** エラー */
	errors: string[];
}

/**
 * プル結果
 */
export interface PullResult {
	/** プル成功件数 */
	count: number;
	/** エラー */
	errors: string[];
}

// ============================================================================
// 同期キュー
// ============================================================================

/**
 * 同期操作の種類
 */
export type SyncOperation = "create" | "update" | "delete";

/**
 * 同期対象のテーブル名
 */
export type SyncTableName = keyof LocalAppDatabase;

/**
 * 同期キューアイテム
 */
export interface SyncQueueItem {
	/** キューアイテムID */
	id: string;
	/** テーブル名 */
	table: SyncTableName;
	/** 操作種類 */
	operation: SyncOperation;
	/** エンティティID */
	entityId: string;
	/** データ（create/update時） */
	data: SyncableEntity | null;
	/** キューに追加された日時 */
	timestamp: string;
	/** リトライ回数 */
	retryCount: number;
	/** 最大リトライ回数 */
	maxRetries: number;
}

// ============================================================================
// 競合解決
// ============================================================================

/**
 * 競合解決の結果（どちらを採用するか）
 */
export type ConflictWinner = "local" | "server";

/**
 * 競合データ
 */
export interface ConflictData<T extends SyncableEntity> {
	/** ローカルデータ */
	local: T;
	/** サーバーデータ */
	server: T;
	/** テーブル名 */
	tableName: SyncTableName;
}

// ============================================================================
// 同期イベント
// ============================================================================

/**
 * 同期イベントの種類
 */
export type SyncEventType =
	| "sync_started"
	| "sync_completed"
	| "sync_failed"
	| "push_started"
	| "push_completed"
	| "pull_started"
	| "pull_completed"
	| "conflict_resolved"
	| "network_online"
	| "network_offline";

/**
 * 同期イベント
 */
export interface SyncEvent {
	/** イベント種類 */
	type: SyncEventType;
	/** イベント発生日時 */
	timestamp: string;
	/** 追加データ */
	data?: Record<string, unknown>;
}

/**
 * 同期イベントリスナー
 */
export type SyncEventListener = (event: SyncEvent) => void;

// ============================================================================
// 同期設定
// ============================================================================

/**
 * 同期設定
 */
export interface SyncConfig {
	/** 自動同期間隔（ミリ秒） */
	syncIntervalMs: number;
	/** リトライ間隔（ミリ秒） */
	retryIntervalMs: number;
	/** 最大リトライ回数 */
	maxRetries: number;
	/** バッチサイズ（一度に同期するアイテム数） */
	batchSize: number;
	/** 競合解決戦略 */
	conflictStrategy: "lww" | "server_wins" | "local_wins";
}

/**
 * デフォルトの同期設定
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
	syncIntervalMs: 5 * 60 * 1000, // 5分
	retryIntervalMs: 30 * 1000, // 30秒
	maxRetries: 3,
	batchSize: 50,
	conflictStrategy: "lww",
};

// ============================================================================
// 同期状態
// ============================================================================

/**
 * 同期状態
 */
export type SyncState = "idle" | "syncing" | "error" | "offline" | "paused";

/**
 * 同期マネージャーの状態
 */
export interface SyncManagerState {
	/** 現在の同期状態 */
	state: SyncState;
	/** オンライン状態 */
	isOnline: boolean;
	/** 最後の同期日時 */
	lastSyncAt: string | null;
	/** 最後の同期結果 */
	lastSyncResult: SyncResult | null;
	/** 同期待ちアイテム数 */
	pendingCount: number;
	/** エラーメッセージ */
	errorMessage: string | null;
}

// ============================================================================
// サーバーデータ型（Supabaseから取得するデータ）
// ============================================================================

/**
 * サーバーから取得するノートデータ
 */
export interface ServerNote {
	id: string;
	owner_id: string;
	slug: string;
	title: string;
	description: string | null;
	visibility: "public" | "unlisted" | "invite" | "private";
	created_at: string;
	updated_at: string;
	is_trashed: boolean;
	trashed_at: string | null;
}

/**
 * サーバーから取得するページデータ
 */
export interface ServerPage {
	id: string;
	user_id: string;
	note_id: string | null;
	title: string;
	thumbnail_url: string | null;
	is_public: boolean;
	scrapbox_page_id: string | null;
	scrapbox_page_list_synced_at: string | null;
	scrapbox_page_content_synced_at: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * サーバーから取得するデッキデータ
 */
export interface ServerDeck {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	is_public: boolean;
	created_at: string;
	updated_at: string;
}

/**
 * サーバーから取得するカードデータ
 */
export interface ServerCard {
	id: string;
	deck_id: string;
	user_id: string;
	front_content: Record<string, unknown>;
	back_content: Record<string, unknown>;
	source_audio_url: string | null;
	source_ocr_image_url: string | null;
	created_at: string;
	updated_at: string;
	ease_factor: number;
	repetition_count: number;
	review_interval: number;
	next_review_at: string | null;
	stability: number;
	difficulty: number;
	last_reviewed_at: string | null;
}

// ============================================================================
// 型ガード
// ============================================================================

/**
 * LocalNoteかどうかを判定
 */
export function isLocalNote(entity: SyncableEntity): entity is LocalNote {
	return "owner_id" in entity && "slug" in entity && "visibility" in entity;
}

/**
 * LocalPageかどうかを判定
 */
export function isLocalPage(entity: SyncableEntity): entity is LocalPage {
	return "note_id" in entity && "user_id" in entity && "is_public" in entity;
}

/**
 * LocalDeckかどうかを判定
 */
export function isLocalDeck(entity: SyncableEntity): entity is LocalDeck {
	return (
		"user_id" in entity &&
		"is_public" in entity &&
		!("note_id" in entity) &&
		!("deck_id" in entity)
	);
}

/**
 * LocalCardかどうかを判定
 */
export function isLocalCard(entity: SyncableEntity): entity is LocalCard {
	return "deck_id" in entity && "front_content" in entity;
}

/**
 * LocalStudyGoalかどうかを判定
 */
export function isLocalStudyGoal(
	entity: SyncableEntity,
): entity is LocalStudyGoal {
	return "progress_rate" in entity && "status" in entity;
}

/**
 * LocalLearningLogかどうかを判定
 */
export function isLocalLearningLog(
	entity: SyncableEntity,
): entity is LocalLearningLog {
	return "card_id" in entity && "practice_mode" in entity;
}

/**
 * LocalMilestoneかどうかを判定
 */
export function isLocalMilestone(
	entity: SyncableEntity,
): entity is LocalMilestone {
	return "goal_id" in entity && "is_completed" in entity;
}

/**
 * LocalUserSettingsかどうかを判定
 */
export function isLocalUserSettings(
	entity: SyncableEntity,
): entity is LocalUserSettings {
	return "theme" in entity && "locale" in entity;
}
