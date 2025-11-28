/**
 * ハイブリッドDB クライアント
 *
 * Web環境とTauri環境を自動判定し、適切なクライアントを提供する
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ hooks/notes/*.ts (将来)
 *   ├─ hooks/pages/*.ts (将来)
 *   ├─ hooks/decks/*.ts (将来)
 *   ├─ hooks/cards/*.ts (将来)
 *   └─ lib/db/sync-manager.ts (Phase B で作成)
 *
 * Dependencies:
 *   ├─ lib/db/types.ts
 *   └─ lib/db/indexeddb-client.ts
 *
 * Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/190
 */

import logger from "../logger";
import { indexedDBClient } from "./indexeddb-client";
import type {
	CreateCardPayload,
	CreateDeckPayload,
	CreateLearningLogPayload,
	CreateMilestonePayload,
	CreateNotePayload,
	CreatePagePayload,
	CreateStudyGoalPayload,
	LocalCard,
	LocalDeck,
	LocalLearningLog,
	LocalMilestone,
	LocalNote,
	LocalPage,
	LocalStudyGoal,
	LocalUserSettings,
	SyncResult,
	UpdateCardPayload,
	UpdateDeckPayload,
	UpdateMilestonePayload,
	UpdateNotePayload,
	UpdatePagePayload,
	UpdateStudyGoalPayload,
	UpdateUserSettingsPayload,
} from "./types";

// ============================================================================
// 環境検出
// ============================================================================

/**
 * Tauri環境かどうかを判定
 */
export function isTauri(): boolean {
	return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * サーバーサイドかどうかを判定
 */
export function isServer(): boolean {
	return typeof window === "undefined";
}

/**
 * IndexedDBが利用可能かどうかを判定
 */
export function isIndexedDBAvailable(): boolean {
	return (
		typeof window !== "undefined" &&
		"indexedDB" in window &&
		window.indexedDB !== null
	);
}

// ============================================================================
// DBクライアントインターフェース
// ============================================================================

/**
 * 共通のCRUDクライアントインターフェース
 *
 * BaseRepositoryで使用するための共通インターフェース。
 * UserSettingsは異なるAPIを持つため、このインターフェースを実装しない。
 */
export interface BaseCRUDClientInterface<T, CreatePayload> {
	getAll(userId: string): Promise<T[]>;
	getById(id: string): Promise<T | undefined>;
	create(userId: string, payload: CreatePayload): Promise<T>;
	update(id: string, payload: Partial<T>): Promise<T | null>;
	delete(id: string): Promise<boolean>;
	hardDelete(id: string): Promise<void>;
	getPendingSync(): Promise<T[]>;
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;
	overwriteWithServer(serverEntity: T): Promise<void>;
}

/**
 * Notes クライアントインターフェース
 */
export interface NotesClientInterface {
	getAll(ownerId: string): Promise<LocalNote[]>;
	getById(id: string): Promise<LocalNote | undefined>;
	create(ownerId: string, payload: CreateNotePayload): Promise<LocalNote>;
	update(id: string, payload: UpdateNotePayload): Promise<LocalNote | null>;
	delete(id: string): Promise<boolean>;
	hardDelete(id: string): Promise<void>;
	getPendingSync(): Promise<LocalNote[]>;
	getDeleted(): Promise<LocalNote[]>;
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;
	markConflict(id: string): Promise<void>;
	overwriteWithServer(serverNote: LocalNote): Promise<void>;
}

/**
 * Pages クライアントインターフェース
 */
export interface PagesClientInterface {
	getAll(userId: string): Promise<LocalPage[]>;
	getByNote(noteId: string): Promise<LocalPage[]>;
	getById(id: string): Promise<LocalPage | undefined>;
	create(userId: string, payload: CreatePagePayload): Promise<LocalPage>;
	update(id: string, payload: UpdatePagePayload): Promise<LocalPage | null>;
	delete(id: string): Promise<boolean>;
	hardDelete(id: string): Promise<void>;
	getPendingSync(): Promise<LocalPage[]>;
	getDeleted(): Promise<LocalPage[]>;
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;
	overwriteWithServer(serverPage: LocalPage): Promise<void>;
}

/**
 * Decks クライアントインターフェース
 */
export interface DecksClientInterface {
	getAll(userId: string): Promise<LocalDeck[]>;
	getById(id: string): Promise<LocalDeck | undefined>;
	create(userId: string, payload: CreateDeckPayload): Promise<LocalDeck>;
	update(id: string, payload: UpdateDeckPayload): Promise<LocalDeck | null>;
	delete(id: string): Promise<boolean>;
	hardDelete(id: string): Promise<void>;
	getPendingSync(): Promise<LocalDeck[]>;
	getDeleted(): Promise<LocalDeck[]>;
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;
	overwriteWithServer(serverDeck: LocalDeck): Promise<void>;
}

/**
 * Cards クライアントインターフェース
 */
export interface CardsClientInterface {
	getByDeck(deckId: string): Promise<LocalCard[]>;
	getAll(userId: string): Promise<LocalCard[]>;
	getById(id: string): Promise<LocalCard | undefined>;
	getDueCards(userId: string): Promise<LocalCard[]>;
	create(userId: string, payload: CreateCardPayload): Promise<LocalCard>;
	createMany(
		userId: string,
		payloads: CreateCardPayload[],
	): Promise<LocalCard[]>;
	update(id: string, payload: UpdateCardPayload): Promise<LocalCard | null>;
	delete(id: string): Promise<boolean>;
	hardDelete(id: string): Promise<void>;
	getPendingSync(): Promise<LocalCard[]>;
	getDeleted(): Promise<LocalCard[]>;
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;
	overwriteWithServer(serverCard: LocalCard): Promise<void>;
}

/**
 * StudyGoals クライアントインターフェース
 */
export interface StudyGoalsClientInterface {
	getAll(userId: string): Promise<LocalStudyGoal[]>;
	getById(id: string): Promise<LocalStudyGoal | undefined>;
	create(
		userId: string,
		payload: CreateStudyGoalPayload,
	): Promise<LocalStudyGoal>;
	update(
		id: string,
		payload: UpdateStudyGoalPayload,
	): Promise<LocalStudyGoal | null>;
	delete(id: string): Promise<boolean>;
	hardDelete(id: string): Promise<void>;
	getPendingSync(): Promise<LocalStudyGoal[]>;
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;
	overwriteWithServer(serverGoal: LocalStudyGoal): Promise<void>;
}

/**
 * LearningLogs クライアントインターフェース
 */
export interface LearningLogsClientInterface {
	getAll(userId: string): Promise<LocalLearningLog[]>;
	getByCard(cardId: string): Promise<LocalLearningLog[]>;
	getById(id: string): Promise<LocalLearningLog | undefined>;
	create(
		userId: string,
		payload: CreateLearningLogPayload,
	): Promise<LocalLearningLog>;
	delete(id: string): Promise<boolean>;
	hardDelete(id: string): Promise<void>;
	getPendingSync(): Promise<LocalLearningLog[]>;
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;
	overwriteWithServer(serverLog: LocalLearningLog): Promise<void>;
}

/**
 * Milestones クライアントインターフェース
 */
export interface MilestonesClientInterface {
	getAll(): Promise<LocalMilestone[]>;
	getByMilestoneId(milestoneId: string): Promise<LocalMilestone | undefined>;
	getById(id: string): Promise<LocalMilestone | undefined>;
	create(payload: CreateMilestonePayload): Promise<LocalMilestone>;
	update(
		id: string,
		payload: UpdateMilestonePayload,
	): Promise<LocalMilestone | null>;
	delete(id: string): Promise<boolean>;
	hardDelete(id: string): Promise<void>;
	getPendingSync(): Promise<LocalMilestone[]>;
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;
	overwriteWithServer(serverMilestone: LocalMilestone): Promise<void>;
}

/**
 * UserSettings クライアントインターフェース
 */
export interface UserSettingsClientInterface {
	get(userId: string): Promise<LocalUserSettings | undefined>;
	getAll(userId: string): Promise<LocalUserSettings[]>;
	getById(id: string): Promise<LocalUserSettings | undefined>;
	upsert(
		userId: string,
		payload: UpdateUserSettingsPayload,
	): Promise<LocalUserSettings>;
	getPendingSync(): Promise<LocalUserSettings[]>;
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;
	overwriteWithServer(serverSettings: LocalUserSettings): Promise<void>;
}

/**
 * ハイブリッドDBクライアントインターフェース
 */
export interface HybridDBClientInterface {
	notes: NotesClientInterface;
	pages: PagesClientInterface;
	decks: DecksClientInterface;
	cards: CardsClientInterface;
	studyGoals: StudyGoalsClientInterface;
	learningLogs: LearningLogsClientInterface;
	milestones: MilestonesClientInterface;
	userSettings: UserSettingsClientInterface;
	closeDB(): Promise<void>;
}

// ============================================================================
// Tauri クライアント（将来実装）
// ============================================================================

/**
 * Tauri環境用のDBクライアント（Phase A で実装）
 *
 * Tauri Commands を通じてRust側のSQLiteと通信する
 * 現時点ではスタブ実装、#191 で本実装を行う
 */
async function getTauriDBClient(): Promise<HybridDBClientInterface> {
	return getIndexedDBClient();
}

// ============================================================================
// IndexedDB クライアント
// ============================================================================

/**
 * IndexedDB環境用のDBクライアントを取得
 */
async function getIndexedDBClient(): Promise<HybridDBClientInterface> {
	if (!isIndexedDBAvailable()) {
		throw new Error("IndexedDB is not available in this environment");
	}

	return {
		notes: indexedDBClient.notes,
		pages: indexedDBClient.pages,
		decks: indexedDBClient.decks,
		cards: indexedDBClient.cards,
		studyGoals: indexedDBClient.studyGoals,
		learningLogs: indexedDBClient.learningLogs,
		milestones: indexedDBClient.milestones,
		userSettings: indexedDBClient.userSettings,
		closeDB: indexedDBClient.closeDB,
	};
}

// ============================================================================
// ハイブリッドクライアント
// ============================================================================

let cachedClient: HybridDBClientInterface | null = null;

/**
 * 環境に応じたDBクライアントを取得
 *
 * - Tauri環境: SQLite (Rust) を使用
 * - Web環境: IndexedDB を使用
 * - サーバーサイド: エラーをスロー（クライアント専用）
 */
export async function getDBClient(): Promise<HybridDBClientInterface> {
	if (isServer()) {
		throw new Error(
			"Local database is not available on the server. Use Supabase client instead.",
		);
	}

	if (cachedClient) {
		return cachedClient;
	}

	if (isTauri()) {
		cachedClient = await getTauriDBClient();
	} else {
		cachedClient = await getIndexedDBClient();
	}

	return cachedClient;
}

/**
 * DBクライアントのキャッシュをクリア
 */
export async function clearDBClientCache(): Promise<void> {
	if (cachedClient) {
		await cachedClient.closeDB();
		cachedClient = null;
	}
}

// ============================================================================
// 同期ヘルパー関数
// ============================================================================

/**
 * 全テーブルの同期待ちデータを取得
 */
export async function getAllPendingSync(): Promise<{
	notes: LocalNote[];
	pages: LocalPage[];
	decks: LocalDeck[];
	cards: LocalCard[];
	studyGoals: LocalStudyGoal[];
	learningLogs: LocalLearningLog[];
	milestones: LocalMilestone[];
	userSettings: LocalUserSettings[];
}> {
	const client = await getDBClient();

	const [
		notes,
		pages,
		decks,
		cards,
		studyGoals,
		learningLogs,
		milestones,
		userSettings,
	] = await Promise.all([
		client.notes.getPendingSync(),
		client.pages.getPendingSync(),
		client.decks.getPendingSync(),
		client.cards.getPendingSync(),
		client.studyGoals.getPendingSync(),
		client.learningLogs.getPendingSync(),
		client.milestones.getPendingSync(),
		client.userSettings.getPendingSync(),
	]);

	return {
		notes,
		pages,
		decks,
		cards,
		studyGoals,
		learningLogs,
		milestones,
		userSettings,
	};
}

/**
 * 同期待ちデータの件数を取得
 */
export async function getPendingSyncCount(): Promise<number> {
	const pending = await getAllPendingSync();
	return (
		pending.notes.length +
		pending.pages.length +
		pending.decks.length +
		pending.cards.length +
		pending.studyGoals.length +
		pending.learningLogs.length +
		pending.milestones.length +
		pending.userSettings.length
	);
}

/**
 * ローカルDBをクリア（全データ削除）
 *
 * 警告: この関数は全てのローカルデータを削除します
 */
export async function clearLocalDB(): Promise<void> {
	const client = await getDBClient();
	await client.closeDB();

	if (!isTauri() && isIndexedDBAvailable()) {
		// IndexedDB を削除
		const deleteRequest = indexedDB.deleteDatabase("for-all-learners-local");
		await new Promise<void>((resolve, reject) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => reject(deleteRequest.error);
			deleteRequest.onblocked = () => {
				logger.warn(
					"[HybridDB] Database deletion blocked. Close all tabs and try again.",
				);
				resolve();
			};
		});
	}

	// キャッシュをクリア
	cachedClient = null;
}

// ============================================================================
// エクスポート
// ============================================================================

export {
	indexedDBClient,
	type LocalNote,
	type LocalPage,
	type LocalDeck,
	type LocalCard,
	type LocalStudyGoal,
	type LocalLearningLog,
	type LocalMilestone,
	type LocalUserSettings,
	type CreateNotePayload,
	type UpdateNotePayload,
	type CreatePagePayload,
	type UpdatePagePayload,
	type CreateDeckPayload,
	type UpdateDeckPayload,
	type CreateCardPayload,
	type UpdateCardPayload,
	type CreateStudyGoalPayload,
	type UpdateStudyGoalPayload,
	type CreateLearningLogPayload,
	type CreateMilestonePayload,
	type UpdateMilestonePayload,
	type UpdateUserSettingsPayload,
	type SyncResult,
};
