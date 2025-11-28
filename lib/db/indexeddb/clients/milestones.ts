/**
 * Milestones クライアント（ロードマップ用）
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
	CreateMilestonePayload,
	LocalMilestone,
	UpdateMilestonePayload,
} from "../../types";
import { getLocalDB } from "../connection";
import {
	generateUUID,
	initSyncMetadata,
	now,
	updateSyncMetadata,
} from "../utils";

export const milestonesClient = {
	/**
	 * 全マイルストーンを取得
	 */
	async getAll(): Promise<LocalMilestone[]> {
		const db = await getLocalDB();
		return db.getAll("milestones");
	},

	/**
	 * milestone_id でマイルストーンを取得
	 */
	async getByMilestoneId(
		milestoneId: string,
	): Promise<LocalMilestone | undefined> {
		const db = await getLocalDB();
		const results = await db.getAllFromIndex(
			"milestones",
			"by-milestone-id",
			milestoneId,
		);
		return results[0];
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
			milestone_id: payload.milestone_id,
			timeframe: payload.timeframe,
			title: payload.title,
			description: payload.description ?? null,
			status: payload.status ?? "planning",
			progress: payload.progress ?? null,
			sort_order: payload.sort_order ?? 0,
			image_url: null,
			features: null,
			related_links: null,
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
