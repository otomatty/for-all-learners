/**
 * Decks クライアント
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/db/indexeddb/clients/index.ts
 *
 * Dependencies:
 *   ├─ lib/db/indexeddb/connection.ts
 *   ├─ lib/db/indexeddb/utils.ts
 *   └─ lib/db/types.ts
 */

import type {
	CreateDeckPayload,
	LocalDeck,
	UpdateDeckPayload,
} from "../../types";
import { getLocalDB } from "../connection";
import {
	generateUUID,
	initSyncMetadata,
	now,
	updateSyncMetadata,
} from "../utils";

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
