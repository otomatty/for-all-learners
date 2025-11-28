/**
 * Learning Logs クライアント
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

import type { CreateLearningLogPayload, LocalLearningLog } from "../../types";
import { getLocalDB } from "../connection";
import {
	generateUUID,
	initSyncMetadata,
	now,
	updateSyncMetadata,
} from "../utils";

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
