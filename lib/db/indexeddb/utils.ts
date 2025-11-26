/**
 * IndexedDB ユーティリティ関数
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/db/indexeddb/clients/*.ts
 *
 * Dependencies:
 *   └─ lib/db/types.ts
 */

import type { SyncableEntity } from "../types";

/**
 * 現在のISO日時文字列を取得
 */
export function now(): string {
	return new Date().toISOString();
}

/**
 * UUIDを生成
 */
export function generateUUID(): string {
	return crypto.randomUUID();
}

/**
 * 同期メタデータを初期化
 */
export function initSyncMetadata(): Pick<
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
export function updateSyncMetadata(): Pick<
	SyncableEntity,
	"sync_status" | "local_updated_at"
> {
	return {
		sync_status: "pending",
		local_updated_at: now(),
	};
}
