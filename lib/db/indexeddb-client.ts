/**
 * IndexedDB クライアント
 *
 * Web環境用のローカルデータベースクライアント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/db/hybrid-client.ts
 *
 * Dependencies:
 *   └─ lib/db/types.ts
 *
 * Spec: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/190
 */

import { type IDBPDatabase, openDB } from "idb";
import {
	type CreateCardPayload,
	type CreateDeckPayload,
	type CreateLearningLogPayload,
	type CreateMilestonePayload,
	type CreateNotePayload,
	type CreatePagePayload,
	type CreateStudyGoalPayload,
	DB_NAME,
	DB_VERSION,
	type LocalAppDatabase,
	type LocalCard,
	type LocalDeck,
	type LocalLearningLog,
	type LocalMilestone,
	type LocalNote,
	type LocalPage,
	type LocalStudyGoal,
	type LocalUserSettings,
	type SyncableEntity,
	type UpdateCardPayload,
	type UpdateDeckPayload,
	type UpdateMilestonePayload,
	type UpdateNotePayload,
	type UpdatePagePayload,
	type UpdateStudyGoalPayload,
	type UpdateUserSettingsPayload,
} from "./types";

// ============================================================================
// データベース接続
// ============================================================================

let dbPromise: Promise<IDBPDatabase<LocalAppDatabase>> | null = null;

/**
 * IndexedDB データベースを取得または初期化する
 */
export async function getLocalDB(): Promise<IDBPDatabase<LocalAppDatabase>> {
	if (!dbPromise) {
		dbPromise = openDB<LocalAppDatabase>(DB_NAME, DB_VERSION, {
			upgrade(db) {
				// Notes ストア
				if (!db.objectStoreNames.contains("notes")) {
					const notesStore = db.createObjectStore("notes", { keyPath: "id" });
					notesStore.createIndex("by-owner", "owner_id");
					notesStore.createIndex("by-sync-status", "sync_status");
					notesStore.createIndex("by-updated", "local_updated_at");
				}

				// Pages ストア
				if (!db.objectStoreNames.contains("pages")) {
					const pagesStore = db.createObjectStore("pages", { keyPath: "id" });
					pagesStore.createIndex("by-user", "user_id");
					pagesStore.createIndex("by-note", "note_id");
					pagesStore.createIndex("by-sync-status", "sync_status");
					pagesStore.createIndex("by-updated", "local_updated_at");
				}

				// Decks ストア
				if (!db.objectStoreNames.contains("decks")) {
					const decksStore = db.createObjectStore("decks", { keyPath: "id" });
					decksStore.createIndex("by-user", "user_id");
					decksStore.createIndex("by-sync-status", "sync_status");
					decksStore.createIndex("by-updated", "local_updated_at");
				}

				// Cards ストア
				if (!db.objectStoreNames.contains("cards")) {
					const cardsStore = db.createObjectStore("cards", { keyPath: "id" });
					cardsStore.createIndex("by-deck", "deck_id");
					cardsStore.createIndex("by-user", "user_id");
					cardsStore.createIndex("by-sync-status", "sync_status");
					cardsStore.createIndex("by-next-review", "next_review_at");
					cardsStore.createIndex("by-updated", "local_updated_at");
				}

				// Study Goals ストア
				if (!db.objectStoreNames.contains("study_goals")) {
					const goalsStore = db.createObjectStore("study_goals", {
						keyPath: "id",
					});
					goalsStore.createIndex("by-user", "user_id");
					goalsStore.createIndex("by-sync-status", "sync_status");
					goalsStore.createIndex("by-status", "status");
				}

				// Learning Logs ストア
				if (!db.objectStoreNames.contains("learning_logs")) {
					const logsStore = db.createObjectStore("learning_logs", {
						keyPath: "id",
					});
					logsStore.createIndex("by-user", "user_id");
					logsStore.createIndex("by-card", "card_id");
					logsStore.createIndex("by-sync-status", "sync_status");
					logsStore.createIndex("by-answered", "answered_at");
				}

				// Milestones ストア
				if (!db.objectStoreNames.contains("milestones")) {
					const milestonesStore = db.createObjectStore("milestones", {
						keyPath: "id",
					});
					milestonesStore.createIndex("by-goal", "goal_id");
					milestonesStore.createIndex("by-sync-status", "sync_status");
				}

				// User Settings ストア
				if (!db.objectStoreNames.contains("user_settings")) {
					const settingsStore = db.createObjectStore("user_settings", {
						keyPath: "id",
					});
					settingsStore.createIndex("by-user", "user_id");
					settingsStore.createIndex("by-sync-status", "sync_status");
				}
			},
		});
	}
	return dbPromise;
}

/**
 * データベースを閉じる
 */
export async function closeLocalDB(): Promise<void> {
	if (dbPromise) {
		const db = await dbPromise;
		db.close();
		dbPromise = null;
	}
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * 現在のISO日時文字列を取得
 */
function now(): string {
	return new Date().toISOString();
}

/**
 * UUIDを生成
 */
function generateUUID(): string {
	return crypto.randomUUID();
}

/**
 * 同期メタデータを初期化
 */
function initSyncMetadata(): Pick<
	SyncableEntity,
	"sync_status" | "synced_at" | "local_updated_at" | "server_updated_at"
> {
	return {
		sync_status: "pending",
		synced_at: null,
		local_updated_at: now(),
		server_updated_at: null,
	};
}

/**
 * 更新時の同期メタデータを取得
 */
function updateSyncMetadata(): Pick<
	SyncableEntity,
	"sync_status" | "local_updated_at"
> {
	return {
		sync_status: "pending",
		local_updated_at: now(),
	};
}

// ============================================================================
// Notes CRUD
// ============================================================================

export const notesClient = {
	/**
	 * オーナーの全ノートを取得
	 */
	async getAll(ownerId: string): Promise<LocalNote[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("notes", "by-owner", ownerId);
	},

	/**
	 * IDでノートを取得
	 */
	async getById(id: string): Promise<LocalNote | undefined> {
		const db = await getLocalDB();
		return db.get("notes", id);
	},

	/**
	 * ノートを作成
	 */
	async create(
		ownerId: string,
		payload: CreateNotePayload,
	): Promise<LocalNote> {
		const db = await getLocalDB();
		const timestamp = now();
		const note: LocalNote = {
			id: generateUUID(),
			owner_id: ownerId,
			slug: payload.slug,
			title: payload.title,
			description: payload.description ?? null,
			visibility: payload.visibility ?? "private",
			created_at: timestamp,
			updated_at: timestamp,
			is_trashed: false,
			trashed_at: null,
			...initSyncMetadata(),
		};
		await db.put("notes", note);
		return note;
	},

	/**
	 * ノートを更新
	 */
	async update(
		id: string,
		payload: UpdateNotePayload,
	): Promise<LocalNote | null> {
		const db = await getLocalDB();
		const existing = await db.get("notes", id);
		if (!existing) return null;

		const updated: LocalNote = {
			...existing,
			...payload,
			updated_at: now(),
			...updateSyncMetadata(),
		};
		await db.put("notes", updated);
		return updated;
	},

	/**
	 * ノートを削除（論理削除）
	 */
	async delete(id: string): Promise<boolean> {
		const db = await getLocalDB();
		const existing = await db.get("notes", id);
		if (!existing) return false;

		const deleted: LocalNote = {
			...existing,
			...updateSyncMetadata(),
			sync_status: "deleted",
		};
		await db.put("notes", deleted);
		return true;
	},

	/**
	 * ノートを物理削除
	 */
	async hardDelete(id: string): Promise<void> {
		const db = await getLocalDB();
		await db.delete("notes", id);
	},

	/**
	 * 同期待ちのノートを取得
	 */
	async getPendingSync(): Promise<LocalNote[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("notes", "by-sync-status", "pending");
	},

	/**
	 * 削除済み（同期待ち）のノートを取得
	 */
	async getDeleted(): Promise<LocalNote[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("notes", "by-sync-status", "deleted");
	},

	/**
	 * 同期完了をマーク
	 */
	async markSynced(id: string, serverUpdatedAt: string): Promise<void> {
		const db = await getLocalDB();
		const existing = await db.get("notes", id);
		if (!existing) return;

		const synced: LocalNote = {
			...existing,
			sync_status: "synced",
			synced_at: now(),
			server_updated_at: serverUpdatedAt,
		};
		await db.put("notes", synced);
	},

	/**
	 * 競合をマーク
	 */
	async markConflict(id: string): Promise<void> {
		const db = await getLocalDB();
		const existing = await db.get("notes", id);
		if (!existing) return;

		const conflicted: LocalNote = {
			...existing,
			sync_status: "conflict",
		};
		await db.put("notes", conflicted);
	},

	/**
	 * サーバーデータで上書き（競合解決時）
	 */
	async overwriteWithServer(serverNote: LocalNote): Promise<void> {
		const db = await getLocalDB();
		const synced: LocalNote = {
			...serverNote,
			sync_status: "synced",
			synced_at: now(),
			local_updated_at: serverNote.updated_at,
			server_updated_at: serverNote.updated_at,
		};
		await db.put("notes", synced);
	},
};

// ============================================================================
// Pages CRUD
// ============================================================================

export const pagesClient = {
	/**
	 * ユーザーの全ページを取得
	 */
	async getAll(userId: string): Promise<LocalPage[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("pages", "by-user", userId);
	},

	/**
	 * ノートのページを取得
	 */
	async getByNote(noteId: string): Promise<LocalPage[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("pages", "by-note", noteId);
	},

	/**
	 * IDでページを取得
	 */
	async getById(id: string): Promise<LocalPage | undefined> {
		const db = await getLocalDB();
		return db.get("pages", id);
	},

	/**
	 * ページを作成
	 */
	async create(userId: string, payload: CreatePagePayload): Promise<LocalPage> {
		const db = await getLocalDB();
		const timestamp = now();
		const page: LocalPage = {
			id: generateUUID(),
			user_id: userId,
			note_id: payload.note_id ?? null,
			title: payload.title,
			thumbnail_url: payload.thumbnail_url ?? null,
			is_public: payload.is_public ?? false,
			scrapbox_page_id: null,
			scrapbox_page_list_synced_at: null,
			scrapbox_page_content_synced_at: null,
			created_at: timestamp,
			updated_at: timestamp,
			...initSyncMetadata(),
		};
		await db.put("pages", page);
		return page;
	},

	/**
	 * ページを更新
	 */
	async update(
		id: string,
		payload: UpdatePagePayload,
	): Promise<LocalPage | null> {
		const db = await getLocalDB();
		const existing = await db.get("pages", id);
		if (!existing) return null;

		const updated: LocalPage = {
			...existing,
			...payload,
			updated_at: now(),
			...updateSyncMetadata(),
		};
		await db.put("pages", updated);
		return updated;
	},

	/**
	 * ページを削除（論理削除）
	 */
	async delete(id: string): Promise<boolean> {
		const db = await getLocalDB();
		const existing = await db.get("pages", id);
		if (!existing) return false;

		const deleted: LocalPage = {
			...existing,
			...updateSyncMetadata(),
			sync_status: "deleted",
		};
		await db.put("pages", deleted);
		return true;
	},

	/**
	 * ページを物理削除
	 */
	async hardDelete(id: string): Promise<void> {
		const db = await getLocalDB();
		await db.delete("pages", id);
	},

	/**
	 * 同期待ちのページを取得
	 */
	async getPendingSync(): Promise<LocalPage[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("pages", "by-sync-status", "pending");
	},

	/**
	 * 削除済み（同期待ち）のページを取得
	 */
	async getDeleted(): Promise<LocalPage[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("pages", "by-sync-status", "deleted");
	},

	/**
	 * 同期完了をマーク
	 */
	async markSynced(id: string, serverUpdatedAt: string): Promise<void> {
		const db = await getLocalDB();
		const existing = await db.get("pages", id);
		if (!existing) return;

		const synced: LocalPage = {
			...existing,
			sync_status: "synced",
			synced_at: now(),
			server_updated_at: serverUpdatedAt,
		};
		await db.put("pages", synced);
	},

	/**
	 * サーバーデータで上書き
	 */
	async overwriteWithServer(serverPage: LocalPage): Promise<void> {
		const db = await getLocalDB();
		const synced: LocalPage = {
			...serverPage,
			sync_status: "synced",
			synced_at: now(),
			local_updated_at: serverPage.updated_at,
			server_updated_at: serverPage.updated_at,
		};
		await db.put("pages", synced);
	},
};

// ============================================================================
// Decks CRUD
// ============================================================================

export const decksClient = {
	/**
	 * ユーザーの全デッキを取得
	 */
	async getAll(userId: string): Promise<LocalDeck[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("decks", "by-user", userId);
	},

	/**
	 * IDでデッキを取得
	 */
	async getById(id: string): Promise<LocalDeck | undefined> {
		const db = await getLocalDB();
		return db.get("decks", id);
	},

	/**
	 * デッキを作成
	 */
	async create(userId: string, payload: CreateDeckPayload): Promise<LocalDeck> {
		const db = await getLocalDB();
		const timestamp = now();
		const deck: LocalDeck = {
			id: generateUUID(),
			user_id: userId,
			title: payload.title,
			description: payload.description ?? null,
			is_public: payload.is_public ?? false,
			created_at: timestamp,
			updated_at: timestamp,
			...initSyncMetadata(),
		};
		await db.put("decks", deck);
		return deck;
	},

	/**
	 * デッキを更新
	 */
	async update(
		id: string,
		payload: UpdateDeckPayload,
	): Promise<LocalDeck | null> {
		const db = await getLocalDB();
		const existing = await db.get("decks", id);
		if (!existing) return null;

		const updated: LocalDeck = {
			...existing,
			...payload,
			updated_at: now(),
			...updateSyncMetadata(),
		};
		await db.put("decks", updated);
		return updated;
	},

	/**
	 * デッキを削除（論理削除）
	 */
	async delete(id: string): Promise<boolean> {
		const db = await getLocalDB();
		const existing = await db.get("decks", id);
		if (!existing) return false;

		const deleted: LocalDeck = {
			...existing,
			...updateSyncMetadata(),
			sync_status: "deleted",
		};
		await db.put("decks", deleted);
		return true;
	},

	/**
	 * デッキを物理削除
	 */
	async hardDelete(id: string): Promise<void> {
		const db = await getLocalDB();
		await db.delete("decks", id);
	},

	/**
	 * 同期待ちのデッキを取得
	 */
	async getPendingSync(): Promise<LocalDeck[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("decks", "by-sync-status", "pending");
	},

	/**
	 * 削除済み（同期待ち）のデッキを取得
	 */
	async getDeleted(): Promise<LocalDeck[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("decks", "by-sync-status", "deleted");
	},

	/**
	 * 同期完了をマーク
	 */
	async markSynced(id: string, serverUpdatedAt: string): Promise<void> {
		const db = await getLocalDB();
		const existing = await db.get("decks", id);
		if (!existing) return;

		const synced: LocalDeck = {
			...existing,
			sync_status: "synced",
			synced_at: now(),
			server_updated_at: serverUpdatedAt,
		};
		await db.put("decks", synced);
	},

	/**
	 * サーバーデータで上書き
	 */
	async overwriteWithServer(serverDeck: LocalDeck): Promise<void> {
		const db = await getLocalDB();
		const synced: LocalDeck = {
			...serverDeck,
			sync_status: "synced",
			synced_at: now(),
			local_updated_at: serverDeck.updated_at,
			server_updated_at: serverDeck.updated_at,
		};
		await db.put("decks", synced);
	},
};

// ============================================================================
// Cards CRUD
// ============================================================================

export const cardsClient = {
	/**
	 * デッキの全カードを取得
	 */
	async getByDeck(deckId: string): Promise<LocalCard[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("cards", "by-deck", deckId);
	},

	/**
	 * ユーザーの全カードを取得
	 */
	async getAll(userId: string): Promise<LocalCard[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("cards", "by-user", userId);
	},

	/**
	 * IDでカードを取得
	 */
	async getById(id: string): Promise<LocalCard | undefined> {
		const db = await getLocalDB();
		return db.get("cards", id);
	},

	/**
	 * 期限切れカードを取得
	 */
	async getDueCards(userId: string): Promise<LocalCard[]> {
		const db = await getLocalDB();
		const allCards = await db.getAllFromIndex("cards", "by-user", userId);
		const currentTime = now();
		return allCards.filter(
			(card) => card.next_review_at && card.next_review_at <= currentTime,
		);
	},

	/**
	 * カードを作成
	 */
	async create(userId: string, payload: CreateCardPayload): Promise<LocalCard> {
		const db = await getLocalDB();
		const timestamp = now();
		const card: LocalCard = {
			id: generateUUID(),
			deck_id: payload.deck_id,
			user_id: userId,
			front_content: payload.front_content,
			back_content: payload.back_content,
			source_audio_url: payload.source_audio_url ?? null,
			source_ocr_image_url: payload.source_ocr_image_url ?? null,
			created_at: timestamp,
			updated_at: timestamp,
			ease_factor: 2.5,
			repetition_count: 0,
			review_interval: 0,
			next_review_at: null,
			stability: 0.0,
			difficulty: 1.0,
			last_reviewed_at: null,
			...initSyncMetadata(),
		};
		await db.put("cards", card);
		return card;
	},

	/**
	 * カードを一括作成
	 */
	async createMany(
		userId: string,
		payloads: CreateCardPayload[],
	): Promise<LocalCard[]> {
		const db = await getLocalDB();
		const timestamp = now();
		const cards: LocalCard[] = payloads.map((payload) => ({
			id: generateUUID(),
			deck_id: payload.deck_id,
			user_id: userId,
			front_content: payload.front_content,
			back_content: payload.back_content,
			source_audio_url: payload.source_audio_url ?? null,
			source_ocr_image_url: payload.source_ocr_image_url ?? null,
			created_at: timestamp,
			updated_at: timestamp,
			ease_factor: 2.5,
			repetition_count: 0,
			review_interval: 0,
			next_review_at: null,
			stability: 0.0,
			difficulty: 1.0,
			last_reviewed_at: null,
			...initSyncMetadata(),
		}));

		const tx = db.transaction("cards", "readwrite");
		await Promise.all([...cards.map((card) => tx.store.put(card)), tx.done]);

		return cards;
	},

	/**
	 * カードを更新
	 */
	async update(
		id: string,
		payload: UpdateCardPayload,
	): Promise<LocalCard | null> {
		const db = await getLocalDB();
		const existing = await db.get("cards", id);
		if (!existing) return null;

		const updated: LocalCard = {
			...existing,
			...payload,
			updated_at: now(),
			...updateSyncMetadata(),
		};
		await db.put("cards", updated);
		return updated;
	},

	/**
	 * カードを削除（論理削除）
	 */
	async delete(id: string): Promise<boolean> {
		const db = await getLocalDB();
		const existing = await db.get("cards", id);
		if (!existing) return false;

		const deleted: LocalCard = {
			...existing,
			...updateSyncMetadata(),
			sync_status: "deleted",
		};
		await db.put("cards", deleted);
		return true;
	},

	/**
	 * カードを物理削除
	 */
	async hardDelete(id: string): Promise<void> {
		const db = await getLocalDB();
		await db.delete("cards", id);
	},

	/**
	 * 同期待ちのカードを取得
	 */
	async getPendingSync(): Promise<LocalCard[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("cards", "by-sync-status", "pending");
	},

	/**
	 * 削除済み（同期待ち）のカードを取得
	 */
	async getDeleted(): Promise<LocalCard[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("cards", "by-sync-status", "deleted");
	},

	/**
	 * 同期完了をマーク
	 */
	async markSynced(id: string, serverUpdatedAt: string): Promise<void> {
		const db = await getLocalDB();
		const existing = await db.get("cards", id);
		if (!existing) return;

		const synced: LocalCard = {
			...existing,
			sync_status: "synced",
			synced_at: now(),
			server_updated_at: serverUpdatedAt,
		};
		await db.put("cards", synced);
	},

	/**
	 * サーバーデータで上書き
	 */
	async overwriteWithServer(serverCard: LocalCard): Promise<void> {
		const db = await getLocalDB();
		const synced: LocalCard = {
			...serverCard,
			sync_status: "synced",
			synced_at: now(),
			local_updated_at: serverCard.updated_at,
			server_updated_at: serverCard.updated_at,
		};
		await db.put("cards", synced);
	},
};

// ============================================================================
// Study Goals CRUD
// ============================================================================

export const studyGoalsClient = {
	/**
	 * ユーザーの全学習目標を取得
	 */
	async getAll(userId: string): Promise<LocalStudyGoal[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("study_goals", "by-user", userId);
	},

	/**
	 * IDで学習目標を取得
	 */
	async getById(id: string): Promise<LocalStudyGoal | undefined> {
		const db = await getLocalDB();
		return db.get("study_goals", id);
	},

	/**
	 * 学習目標を作成
	 */
	async create(
		userId: string,
		payload: CreateStudyGoalPayload,
	): Promise<LocalStudyGoal> {
		const db = await getLocalDB();
		const timestamp = now();
		const goal: LocalStudyGoal = {
			id: generateUUID(),
			user_id: userId,
			title: payload.title,
			description: payload.description ?? null,
			created_at: timestamp,
			updated_at: timestamp,
			deadline: payload.deadline ?? null,
			progress_rate: 0,
			status: "not_started",
			completed_at: null,
			...initSyncMetadata(),
		};
		await db.put("study_goals", goal);
		return goal;
	},

	/**
	 * 学習目標を更新
	 */
	async update(
		id: string,
		payload: UpdateStudyGoalPayload,
	): Promise<LocalStudyGoal | null> {
		const db = await getLocalDB();
		const existing = await db.get("study_goals", id);
		if (!existing) return null;

		const updated: LocalStudyGoal = {
			...existing,
			...payload,
			updated_at: now(),
			...updateSyncMetadata(),
		};
		await db.put("study_goals", updated);
		return updated;
	},

	/**
	 * 学習目標を削除（論理削除）
	 */
	async delete(id: string): Promise<boolean> {
		const db = await getLocalDB();
		const existing = await db.get("study_goals", id);
		if (!existing) return false;

		const deleted: LocalStudyGoal = {
			...existing,
			...updateSyncMetadata(),
			sync_status: "deleted",
		};
		await db.put("study_goals", deleted);
		return true;
	},

	/**
	 * 学習目標を物理削除
	 */
	async hardDelete(id: string): Promise<void> {
		const db = await getLocalDB();
		await db.delete("study_goals", id);
	},

	/**
	 * 同期待ちの学習目標を取得
	 */
	async getPendingSync(): Promise<LocalStudyGoal[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("study_goals", "by-sync-status", "pending");
	},

	/**
	 * 同期完了をマーク
	 */
	async markSynced(id: string, serverUpdatedAt: string): Promise<void> {
		const db = await getLocalDB();
		const existing = await db.get("study_goals", id);
		if (!existing) return;

		const synced: LocalStudyGoal = {
			...existing,
			sync_status: "synced",
			synced_at: now(),
			server_updated_at: serverUpdatedAt,
		};
		await db.put("study_goals", synced);
	},

	/**
	 * サーバーデータで上書き
	 */
	async overwriteWithServer(serverGoal: LocalStudyGoal): Promise<void> {
		const db = await getLocalDB();
		const synced: LocalStudyGoal = {
			...serverGoal,
			sync_status: "synced",
			synced_at: now(),
			local_updated_at: serverGoal.updated_at,
			server_updated_at: serverGoal.updated_at,
		};
		await db.put("study_goals", synced);
	},
};

// ============================================================================
// Learning Logs CRUD
// ============================================================================

export const learningLogsClient = {
	/**
	 * ユーザーの全学習ログを取得
	 */
	async getAll(userId: string): Promise<LocalLearningLog[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("learning_logs", "by-user", userId);
	},

	/**
	 * カードの学習ログを取得
	 */
	async getByCard(cardId: string): Promise<LocalLearningLog[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("learning_logs", "by-card", cardId);
	},

	/**
	 * IDで学習ログを取得
	 */
	async getById(id: string): Promise<LocalLearningLog | undefined> {
		const db = await getLocalDB();
		return db.get("learning_logs", id);
	},

	/**
	 * 学習ログを作成
	 */
	async create(
		userId: string,
		payload: CreateLearningLogPayload,
	): Promise<LocalLearningLog> {
		const db = await getLocalDB();
		const timestamp = now();
		const log: LocalLearningLog = {
			id: generateUUID(),
			user_id: userId,
			card_id: payload.card_id,
			question_id: payload.question_id ?? null,
			answered_at: timestamp,
			is_correct: payload.is_correct,
			user_answer: payload.user_answer ?? null,
			practice_mode: payload.practice_mode,
			review_interval: null,
			next_review_at: null,
			quality: payload.quality,
			response_time: payload.response_time,
			effort_time: payload.effort_time ?? 0,
			attempt_count: 1,
			...initSyncMetadata(),
		};
		await db.put("learning_logs", log);
		return log;
	},

	/**
	 * 学習ログを削除（論理削除）
	 */
	async delete(id: string): Promise<boolean> {
		const db = await getLocalDB();
		const existing = await db.get("learning_logs", id);
		if (!existing) return false;

		const deleted: LocalLearningLog = {
			...existing,
			...updateSyncMetadata(),
			sync_status: "deleted",
		};
		await db.put("learning_logs", deleted);
		return true;
	},

	/**
	 * 学習ログを物理削除
	 */
	async hardDelete(id: string): Promise<void> {
		const db = await getLocalDB();
		await db.delete("learning_logs", id);
	},

	/**
	 * 同期待ちの学習ログを取得
	 */
	async getPendingSync(): Promise<LocalLearningLog[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("learning_logs", "by-sync-status", "pending");
	},

	/**
	 * 同期完了をマーク
	 */
	async markSynced(id: string, serverUpdatedAt: string): Promise<void> {
		const db = await getLocalDB();
		const existing = await db.get("learning_logs", id);
		if (!existing) return;

		const synced: LocalLearningLog = {
			...existing,
			sync_status: "synced",
			synced_at: now(),
			server_updated_at: serverUpdatedAt,
		};
		await db.put("learning_logs", synced);
	},

	/**
	 * サーバーデータで上書き
	 */
	async overwriteWithServer(serverLog: LocalLearningLog): Promise<void> {
		const db = await getLocalDB();
		const synced: LocalLearningLog = {
			...serverLog,
			sync_status: "synced",
			synced_at: now(),
			local_updated_at: serverLog.answered_at,
			server_updated_at: serverLog.answered_at,
		};
		await db.put("learning_logs", synced);
	},
};

// ============================================================================
// Milestones CRUD
// ============================================================================

export const milestonesClient = {
	/**
	 * 学習目標のマイルストーンを取得
	 */
	async getByGoal(goalId: string): Promise<LocalMilestone[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("milestones", "by-goal", goalId);
	},

	/**
	 * IDでマイルストーンを取得
	 */
	async getById(id: string): Promise<LocalMilestone | undefined> {
		const db = await getLocalDB();
		return db.get("milestones", id);
	},

	/**
	 * マイルストーンを作成
	 */
	async create(payload: CreateMilestonePayload): Promise<LocalMilestone> {
		const db = await getLocalDB();
		const timestamp = now();
		const milestone: LocalMilestone = {
			id: generateUUID(),
			goal_id: payload.goal_id,
			title: payload.title,
			description: payload.description ?? null,
			due_date: payload.due_date ?? null,
			is_completed: false,
			created_at: timestamp,
			updated_at: timestamp,
			...initSyncMetadata(),
		};
		await db.put("milestones", milestone);
		return milestone;
	},

	/**
	 * マイルストーンを更新
	 */
	async update(
		id: string,
		payload: UpdateMilestonePayload,
	): Promise<LocalMilestone | null> {
		const db = await getLocalDB();
		const existing = await db.get("milestones", id);
		if (!existing) return null;

		const updated: LocalMilestone = {
			...existing,
			...payload,
			updated_at: now(),
			...updateSyncMetadata(),
		};
		await db.put("milestones", updated);
		return updated;
	},

	/**
	 * マイルストーンを削除（論理削除）
	 */
	async delete(id: string): Promise<boolean> {
		const db = await getLocalDB();
		const existing = await db.get("milestones", id);
		if (!existing) return false;

		const deleted: LocalMilestone = {
			...existing,
			...updateSyncMetadata(),
			sync_status: "deleted",
		};
		await db.put("milestones", deleted);
		return true;
	},

	/**
	 * マイルストーンを物理削除
	 */
	async hardDelete(id: string): Promise<void> {
		const db = await getLocalDB();
		await db.delete("milestones", id);
	},

	/**
	 * 同期待ちのマイルストーンを取得
	 */
	async getPendingSync(): Promise<LocalMilestone[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("milestones", "by-sync-status", "pending");
	},

	/**
	 * 同期完了をマーク
	 */
	async markSynced(id: string, serverUpdatedAt: string): Promise<void> {
		const db = await getLocalDB();
		const existing = await db.get("milestones", id);
		if (!existing) return;

		const synced: LocalMilestone = {
			...existing,
			sync_status: "synced",
			synced_at: now(),
			server_updated_at: serverUpdatedAt,
		};
		await db.put("milestones", synced);
	},

	/**
	 * サーバーデータで上書き
	 */
	async overwriteWithServer(serverMilestone: LocalMilestone): Promise<void> {
		const db = await getLocalDB();
		const synced: LocalMilestone = {
			...serverMilestone,
			sync_status: "synced",
			synced_at: now(),
			local_updated_at: serverMilestone.updated_at,
			server_updated_at: serverMilestone.updated_at,
		};
		await db.put("milestones", synced);
	},
};

// ============================================================================
// User Settings CRUD
// ============================================================================

export const userSettingsClient = {
	/**
	 * ユーザー設定を取得
	 */
	async get(userId: string): Promise<LocalUserSettings | undefined> {
		const db = await getLocalDB();
		const settings = await db.getAllFromIndex(
			"user_settings",
			"by-user",
			userId,
		);
		return settings[0];
	},

	/**
	 * IDでユーザー設定を取得
	 */
	async getById(id: string): Promise<LocalUserSettings | undefined> {
		const db = await getLocalDB();
		return db.get("user_settings", id);
	},

	/**
	 * ユーザー設定を作成または更新
	 */
	async upsert(
		userId: string,
		payload: UpdateUserSettingsPayload,
	): Promise<LocalUserSettings> {
		const db = await getLocalDB();
		const existing = await this.get(userId);

		if (existing) {
			const updated: LocalUserSettings = {
				...existing,
				...payload,
				updated_at: now(),
				...updateSyncMetadata(),
			};
			await db.put("user_settings", updated);
			return updated;
		}

		const timestamp = now();
		const settings: LocalUserSettings = {
			id: generateUUID(),
			user_id: userId,
			theme: payload.theme ?? "ocean",
			mode: payload.mode ?? "light",
			locale: payload.locale ?? "en",
			timezone: payload.timezone ?? "UTC",
			notifications: payload.notifications ?? {},
			items_per_page: payload.items_per_page ?? 20,
			play_help_video_audio: payload.play_help_video_audio ?? false,
			cosense_sync_enabled: payload.cosense_sync_enabled ?? false,
			notion_sync_enabled: payload.notion_sync_enabled ?? false,
			gyazo_sync_enabled: payload.gyazo_sync_enabled ?? false,
			quizlet_sync_enabled: payload.quizlet_sync_enabled ?? false,
			created_at: timestamp,
			updated_at: timestamp,
			...initSyncMetadata(),
		};
		await db.put("user_settings", settings);
		return settings;
	},

	/**
	 * 同期待ちの設定を取得
	 */
	async getPendingSync(): Promise<LocalUserSettings[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("user_settings", "by-sync-status", "pending");
	},

	/**
	 * 同期完了をマーク
	 */
	async markSynced(id: string, serverUpdatedAt: string): Promise<void> {
		const db = await getLocalDB();
		const existing = await db.get("user_settings", id);
		if (!existing) return;

		const synced: LocalUserSettings = {
			...existing,
			sync_status: "synced",
			synced_at: now(),
			server_updated_at: serverUpdatedAt,
		};
		await db.put("user_settings", synced);
	},

	/**
	 * サーバーデータで上書き
	 */
	async overwriteWithServer(serverSettings: LocalUserSettings): Promise<void> {
		const db = await getLocalDB();
		const synced: LocalUserSettings = {
			...serverSettings,
			sync_status: "synced",
			synced_at: now(),
			local_updated_at: serverSettings.updated_at,
			server_updated_at: serverSettings.updated_at,
		};
		await db.put("user_settings", synced);
	},
};

// ============================================================================
// エクスポート
// ============================================================================

/**
 * IndexedDB クライアント
 */
export const indexedDBClient = {
	notes: notesClient,
	pages: pagesClient,
	decks: decksClient,
	cards: cardsClient,
	studyGoals: studyGoalsClient,
	learningLogs: learningLogsClient,
	milestones: milestonesClient,
	userSettings: userSettingsClient,
	getDB: getLocalDB,
	closeDB: closeLocalDB,
};
