/**
 * 競合解決ロジック（Last Write Wins）
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ lib/sync/sync-manager.ts
 *
 * Dependencies:
 *   └─ lib/sync/types.ts
 *
 * Spec: lib/sync/sync.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/194
 */

import type { SyncableEntity } from "@/lib/db/types";
import type { ConflictData, ConflictWinner, SyncTableName } from "./types";

/**
 * 競合解決クラス
 *
 * Last Write Wins（LWW）方式で競合を解決する
 * - local_updated_at と server_updated_at を比較
 * - 最後に更新された方を採用
 * - 同時刻の場合はローカルを優先（ユーザーの意図を尊重）
 */
export class ConflictResolver {
	/**
	 * Last Write Wins で競合を解決
	 *
	 * @param local ローカルデータ
	 * @param server サーバーデータ
	 * @returns 'local' | 'server' - どちらのデータを採用するか
	 */
	resolve<T extends SyncableEntity>(local: T, server: T): ConflictWinner {
		const localTime = new Date(local.local_updated_at).getTime();
		// server_updated_at が null の場合は 0（最古）として扱う
		const serverTime = server.server_updated_at
			? new Date(server.server_updated_at).getTime()
			: 0;

		// 最後に更新された方を採用
		// 同時刻の場合はローカルを優先（ユーザーの意図を尊重）
		return localTime >= serverTime ? "local" : "server";
	}

	/**
	 * ローカルデータとサーバーデータをマージ
	 *
	 * @param local ローカルデータ
	 * @param server サーバーデータ
	 * @returns マージ後のデータ
	 */
	merge<T extends SyncableEntity>(local: T, server: T): T {
		const winner = this.resolve(local, server);

		if (winner === "local") {
			// ローカルが勝ち → サーバーに再プッシュが必要
			return {
				...local,
				sync_status: "pending" as const,
			};
		}

		// サーバーが勝ち → ローカルを更新
		return {
			...server,
			sync_status: "synced" as const,
			synced_at: new Date().toISOString(),
			local_updated_at: server.server_updated_at ?? server.local_updated_at,
		};
	}

	/**
	 * 競合データから解決結果を取得
	 *
	 * @param conflictData 競合データ
	 * @returns 解決結果（勝者とマージ後のデータ）
	 */
	resolveConflict<T extends SyncableEntity>(
		conflictData: ConflictData<T>,
	): {
		winner: ConflictWinner;
		resolved: T;
		tableName: SyncTableName;
	} {
		const winner = this.resolve(conflictData.local, conflictData.server);
		const resolved = this.merge(conflictData.local, conflictData.server);

		return {
			winner,
			resolved,
			tableName: conflictData.tableName,
		};
	}

	/**
	 * 複数の競合を一括解決
	 *
	 * @param conflicts 競合データの配列
	 * @returns 解決結果の配列
	 */
	resolveAll<T extends SyncableEntity>(
		conflicts: ConflictData<T>[],
	): Array<{
		winner: ConflictWinner;
		resolved: T;
		tableName: SyncTableName;
	}> {
		return conflicts.map((conflict) => this.resolveConflict(conflict));
	}

	/**
	 * サーバーデータがローカルより新しいかどうかを判定
	 *
	 * @param local ローカルデータ
	 * @param serverUpdatedAt サーバーの更新日時
	 * @returns サーバーが新しい場合 true
	 */
	isServerNewer<T extends SyncableEntity>(
		local: T,
		serverUpdatedAt: string,
	): boolean {
		const localTime = new Date(local.local_updated_at).getTime();
		const serverTime = new Date(serverUpdatedAt).getTime();
		return serverTime > localTime;
	}

	/**
	 * ローカルデータが同期後に変更されたかどうかを判定
	 *
	 * @param entity ローカルデータ
	 * @returns 同期後に変更された場合 true
	 */
	hasLocalChanges<T extends SyncableEntity>(entity: T): boolean {
		if (!entity.synced_at) {
			// 一度も同期されていない → 新規作成
			return true;
		}

		const syncedTime = new Date(entity.synced_at).getTime();
		const localTime = new Date(entity.local_updated_at).getTime();

		return localTime > syncedTime;
	}
}

/**
 * デフォルトの競合解決インスタンス
 */
export const conflictResolver = new ConflictResolver();
