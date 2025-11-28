/**
 * Pages クライアント
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
	CreatePagePayload,
	LocalPage,
	UpdatePagePayload,
} from "../../types";
import { getLocalDB } from "../connection";
import {
	generateUUID,
	initSyncMetadata,
	now,
	updateSyncMetadata,
} from "../utils";

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
