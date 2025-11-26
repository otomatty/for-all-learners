/**
 * Study Goals クライアント
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
	CreateStudyGoalPayload,
	LocalStudyGoal,
	UpdateStudyGoalPayload,
} from "../../types";
import { getLocalDB } from "../connection";
import {
	generateUUID,
	initSyncMetadata,
	now,
	updateSyncMetadata,
} from "../utils";

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
