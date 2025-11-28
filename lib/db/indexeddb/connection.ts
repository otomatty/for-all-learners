/**
 * IndexedDB 接続管理
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ lib/db/indexeddb/utils.ts
 *   └─ lib/db/indexeddb/clients/*.ts
 *
 * Dependencies:
 *   └─ lib/db/types.ts
 */

import { type IDBPDatabase, openDB } from "idb";
import { DB_NAME, DB_VERSION, type LocalAppDatabase } from "../types";

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

				// Milestones ストア (ロードマップ用)
				if (!db.objectStoreNames.contains("milestones")) {
					const milestonesStore = db.createObjectStore("milestones", {
						keyPath: "id",
					});
					milestonesStore.createIndex("by-milestone-id", "milestone_id");
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
