/**
 * Notes クライアント
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
	CreateNotePayload,
	LocalNote,
	UpdateNotePayload,
} from "../../types";
import { getLocalDB } from "../connection";
import {
	generateUUID,
	initSyncMetadata,
	now,
	updateSyncMetadata,
} from "../utils";

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
			page_count: 0,
			participant_count: 0,
			is_default_note: null,
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
