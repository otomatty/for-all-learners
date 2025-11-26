/**
 * Cards クライアント
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
	CreateCardPayload,
	LocalCard,
	UpdateCardPayload,
} from "../../types";
import { getLocalDB } from "../connection";
import {
	generateUUID,
	initSyncMetadata,
	now,
	updateSyncMetadata,
} from "../utils";

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
