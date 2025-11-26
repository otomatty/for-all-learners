/**
 * Tauri SQLite クライアント
 *
 * TypeScript側からTauri Commandsを呼び出すクライアント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ lib/db/hybrid-client.ts
 *   └─ (各コンポーネント・フック)
 *
 * Dependencies:
 *   └─ lib/db/types.ts
 *
 * Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/192
 */

import { invoke } from "@tauri-apps/api/core";
import type {
	LocalCard,
	LocalDeck,
	LocalLearningLog,
	LocalMilestone,
	LocalNote,
	LocalPage,
	LocalStudyGoal,
	LocalUserSettings,
	UpdateNotePayload,
	UpdatePagePayload,
} from "./types";

// ============================================================================
// Notes クライアント
// ============================================================================

/**
 * ノート操作クライアント
 */
export const notesClient = {
	/**
	 * ユーザーの全ノートを取得
	 */
	getAll: (ownerId: string): Promise<LocalNote[]> =>
		invoke("get_notes", { ownerId }),

	/**
	 * IDでノートを取得
	 */
	getById: (id: string): Promise<LocalNote | null> =>
		invoke("get_note", { id }),

	/**
	 * ノートを作成
	 */
	create: (note: LocalNote): Promise<void> => invoke("create_note", { note }),

	/**
	 * ノートを更新
	 */
	update: (id: string, updates: UpdateNotePayload): Promise<LocalNote | null> =>
		invoke("update_note", { id, updates }),

	/**
	 * ノートを削除（論理削除）
	 */
	delete: (id: string): Promise<boolean> => invoke("delete_note", { id }),

	/**
	 * ノートを物理削除
	 */
	hardDelete: (id: string): Promise<void> => invoke("hard_delete_note", { id }),

	/**
	 * 同期待ちノートを取得
	 */
	getPendingSync: (): Promise<LocalNote[]> => invoke("get_pending_sync_notes"),

	/**
	 * 削除済みノートを取得
	 */
	getDeleted: (): Promise<LocalNote[]> => invoke("get_deleted_notes"),

	/**
	 * ノートを同期済みにマーク
	 */
	markSynced: (id: string, serverUpdatedAt: string): Promise<void> =>
		invoke("mark_note_synced", { id, serverUpdatedAt }),

	/**
	 * サーバーデータでノートを上書き
	 */
	overwriteWithServer: (note: LocalNote): Promise<void> =>
		invoke("overwrite_note_with_server", { note }),
};

// ============================================================================
// Pages クライアント
// ============================================================================

/**
 * ページ操作クライアント
 */
export const pagesClient = {
	/**
	 * ユーザーの全ページを取得
	 */
	getAll: (userId: string): Promise<LocalPage[]> =>
		invoke("get_pages", { userId }),

	/**
	 * ノートに紐づくページを取得
	 */
	getByNote: (noteId: string): Promise<LocalPage[]> =>
		invoke("get_pages_by_note", { noteId }),

	/**
	 * IDでページを取得
	 */
	getById: (id: string): Promise<LocalPage | null> =>
		invoke("get_page", { id }),

	/**
	 * ページを作成
	 */
	create: (page: LocalPage): Promise<void> => invoke("create_page", { page }),

	/**
	 * ページを更新
	 */
	update: (id: string, updates: UpdatePagePayload): Promise<LocalPage | null> =>
		invoke("update_page", { id, updates }),

	/**
	 * ページを削除（論理削除）
	 */
	delete: (id: string): Promise<boolean> => invoke("delete_page", { id }),

	/**
	 * 同期待ちページを取得
	 */
	getPendingSync: (): Promise<LocalPage[]> => invoke("get_pending_sync_pages"),

	/**
	 * ページを同期済みにマーク
	 */
	markSynced: (id: string, serverUpdatedAt: string): Promise<void> =>
		invoke("mark_page_synced", { id, serverUpdatedAt }),
};

// ============================================================================
// Decks クライアント
// ============================================================================

/**
 * デッキ操作クライアント
 */
export const decksClient = {
	/**
	 * ユーザーの全デッキを取得
	 */
	getAll: (userId: string): Promise<LocalDeck[]> =>
		invoke("get_decks", { userId }),

	/**
	 * IDでデッキを取得
	 */
	getById: (id: string): Promise<LocalDeck | null> =>
		invoke("get_deck", { id }),

	/**
	 * デッキを作成
	 */
	create: (deck: LocalDeck): Promise<void> => invoke("create_deck", { deck }),

	/**
	 * デッキを削除（論理削除）
	 */
	delete: (id: string): Promise<boolean> => invoke("delete_deck", { id }),

	/**
	 * 同期待ちデッキを取得
	 */
	getPendingSync: (): Promise<LocalDeck[]> => invoke("get_pending_sync_decks"),
};

// ============================================================================
// Cards クライアント
// ============================================================================

/**
 * カード操作クライアント
 */
export const cardsClient = {
	/**
	 * デッキの全カードを取得
	 */
	getByDeck: (deckId: string): Promise<LocalCard[]> =>
		invoke("get_cards", { deckId }),

	/**
	 * IDでカードを取得
	 */
	getById: (id: string): Promise<LocalCard | null> =>
		invoke("get_card", { id }),

	/**
	 * カードを作成
	 */
	create: (card: LocalCard): Promise<void> => invoke("create_card", { card }),

	/**
	 * カードを削除（論理削除）
	 */
	delete: (id: string): Promise<boolean> => invoke("delete_card", { id }),

	/**
	 * 期限切れカードを取得
	 */
	getDue: (userId: string): Promise<LocalCard[]> =>
		invoke("get_due_cards", { userId }),

	/**
	 * 同期待ちカードを取得
	 */
	getPendingSync: (): Promise<LocalCard[]> => invoke("get_pending_sync_cards"),
};

// ============================================================================
// Study Goals クライアント
// ============================================================================

/**
 * 学習目標操作クライアント
 */
export const studyGoalsClient = {
	/**
	 * ユーザーの全学習目標を取得
	 */
	getAll: (userId: string): Promise<LocalStudyGoal[]> =>
		invoke("get_study_goals", { userId }),

	/**
	 * IDで学習目標を取得
	 */
	getById: (id: string): Promise<LocalStudyGoal | null> =>
		invoke("get_study_goal", { id }),

	/**
	 * 学習目標を作成
	 */
	create: (goal: LocalStudyGoal): Promise<void> =>
		invoke("create_study_goal", { goal }),

	/**
	 * 学習目標を削除（論理削除）
	 */
	delete: (id: string): Promise<boolean> => invoke("delete_study_goal", { id }),

	/**
	 * 同期待ち学習目標を取得
	 */
	getPendingSync: (): Promise<LocalStudyGoal[]> =>
		invoke("get_pending_sync_study_goals"),
};

// ============================================================================
// Learning Logs クライアント
// ============================================================================

/**
 * 学習ログ操作クライアント
 */
export const learningLogsClient = {
	/**
	 * ユーザーの学習ログを取得
	 */
	getByUser: (userId: string): Promise<LocalLearningLog[]> =>
		invoke("get_learning_logs", { userId }),

	/**
	 * カードの学習ログを取得
	 */
	getByCard: (cardId: string): Promise<LocalLearningLog[]> =>
		invoke("get_learning_logs_by_card", { cardId }),

	/**
	 * 学習ログを作成
	 */
	create: (log: LocalLearningLog): Promise<void> =>
		invoke("create_learning_log", { log }),

	/**
	 * 同期待ち学習ログを取得
	 */
	getPendingSync: (): Promise<LocalLearningLog[]> =>
		invoke("get_pending_sync_learning_logs"),
};

// ============================================================================
// Milestones クライアント
// ============================================================================

/**
 * マイルストーン操作クライアント
 */
export const milestonesClient = {
	/**
	 * 学習目標に紐づくマイルストーンを取得
	 */
	getByGoal: (goalId: string): Promise<LocalMilestone[]> =>
		invoke("get_milestones", { goalId }),

	/**
	 * IDでマイルストーンを取得
	 */
	getById: (id: string): Promise<LocalMilestone | null> =>
		invoke("get_milestone", { id }),

	/**
	 * マイルストーンを作成
	 */
	create: (milestone: LocalMilestone): Promise<void> =>
		invoke("create_milestone", { milestone }),

	/**
	 * マイルストーンを削除（論理削除）
	 */
	delete: (id: string): Promise<boolean> => invoke("delete_milestone", { id }),

	/**
	 * 同期待ちマイルストーンを取得
	 */
	getPendingSync: (): Promise<LocalMilestone[]> =>
		invoke("get_pending_sync_milestones"),
};

// ============================================================================
// User Settings クライアント
// ============================================================================

/**
 * ユーザー設定操作クライアント
 */
export const userSettingsClient = {
	/**
	 * ユーザー設定を取得
	 */
	get: (userId: string): Promise<LocalUserSettings | null> =>
		invoke("get_user_settings", { userId }),

	/**
	 * ユーザー設定を作成または更新
	 */
	upsert: (settings: LocalUserSettings): Promise<void> =>
		invoke("upsert_user_settings", { settings }),

	/**
	 * 同期待ちユーザー設定を取得
	 */
	getPendingSync: (): Promise<LocalUserSettings[]> =>
		invoke("get_pending_sync_user_settings"),
};

// ============================================================================
// 統合クライアント
// ============================================================================

/**
 * Tauri SQLite クライアント
 *
 * 全エンティティの操作を統合したクライアント
 */
export const tauriDB = {
	notes: notesClient,
	pages: pagesClient,
	decks: decksClient,
	cards: cardsClient,
	studyGoals: studyGoalsClient,
	learningLogs: learningLogsClient,
	milestones: milestonesClient,
	userSettings: userSettingsClient,
};

export default tauriDB;
