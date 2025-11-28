/**
 * User Settings クライアント
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

import type { LocalUserSettings, UpdateUserSettingsPayload } from "../../types";
import { getLocalDB } from "../connection";
import {
	generateUUID,
	initSyncMetadata,
	now,
	updateSyncMetadata,
} from "../utils";

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
	 * ユーザーの全設定を取得（配列として返す）
	 * UserSettingsはユーザーごとに1つなので、最大1要素の配列を返す
	 */
	async getAll(userId: string): Promise<LocalUserSettings[]> {
		const db = await getLocalDB();
		return db.getAllFromIndex("user_settings", "by-user", userId);
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
		const existing = await userSettingsClient.get(userId);

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
