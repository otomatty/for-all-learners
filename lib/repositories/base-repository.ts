/**
 * Repository 基盤クラス
 *
 * データアクセスを抽象化し、ローカルDBとの通信を管理する
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ lib/repositories/notes-repository.ts
 *   ├─ lib/repositories/pages-repository.ts
 *   ├─ lib/repositories/decks-repository.ts
 *   └─ lib/repositories/cards-repository.ts
 *
 * Dependencies:
 *   ├─ lib/repositories/types.ts
 *   ├─ lib/db/hybrid-client.ts
 *   └─ lib/sync/index.ts
 *
 * Spec: lib/repositories/repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/195
 */

import {
	type BaseCRUDClientInterface,
	getDBClient,
	type HybridDBClientInterface,
} from "@/lib/db/hybrid-client";
import type { SyncableEntity } from "@/lib/db/types";
import logger from "@/lib/logger";
import { syncManager } from "@/lib/sync";
import {
	DEFAULT_REPOSITORY_OPTIONS,
	type EntityName,
	type Repository,
	type RepositoryErrorCode,
	type RepositoryErrorDetails,
	type RepositoryOptions,
} from "./types";

// ============================================================================
// エラークラス
// ============================================================================

/**
 * Repository エラー
 *
 * データアクセス層で発生するエラーを表現
 */
export class RepositoryError extends Error {
	constructor(
		public readonly code: RepositoryErrorCode,
		message?: string,
		public readonly details?: RepositoryErrorDetails,
	) {
		super(message ?? code);
		this.name = "RepositoryError";
	}
}

// ============================================================================
// 基盤クラス
// ============================================================================

/**
 * Repository 基盤クラス
 *
 * 全てのRepositoryクラスの基底クラス。
 * ローカルDBとの通信と同期メタデータの管理を担当。
 *
 * @template T エンティティの型（SyncableEntityを継承し、idを持つ）
 * @template CreatePayload 作成時のペイロード型
 */
export abstract class BaseRepository<
	T extends SyncableEntity & { id: string },
	CreatePayload = unknown,
> implements Repository<T, CreatePayload>
{
	/**
	 * エンティティ名（DBクライアントのプロパティ名）
	 * サブクラスで定義必須
	 */
	protected abstract entityName: EntityName;

	/**
	 * Repository オプション
	 */
	protected options: Required<RepositoryOptions>;

	/**
	 * DBクライアントのキャッシュ
	 */
	private dbClientCache: HybridDBClientInterface | null = null;

	/**
	 * コンストラクタ
	 *
	 * @param options Repository オプション
	 */
	constructor(options: RepositoryOptions = {}) {
		this.options = { ...DEFAULT_REPOSITORY_OPTIONS, ...options };
	}

	/**
	 * DBクライアントを取得
	 */
	protected async getDB(): Promise<HybridDBClientInterface> {
		if (!this.dbClientCache) {
			this.dbClientCache = await getDBClient();
		}
		return this.dbClientCache;
	}

	/**
	 * エンティティ固有のDBクライアントを取得
	 *
	 * @remarks
	 * BaseRepositoryはCRUD操作をサポートするエンティティ用に設計されている。
	 * UserSettingsは異なるAPIを持つため、このメソッドはUserSettings以外の
	 * エンティティに対してのみ使用すべき。
	 */
	protected async getEntityClient(): Promise<
		BaseCRUDClientInterface<T, CreatePayload>
	> {
		const db = await this.getDB();
		// Note: userSettings は異なるインターフェースを持つため、
		// BaseRepository では使用しない想定。型アサーションで対応。
		return db[this.entityName] as unknown as BaseCRUDClientInterface<
			T,
			CreatePayload
		>;
	}

	/**
	 * 作成ペイロードからエンティティを生成
	 * サブクラスで実装必須
	 *
	 * @param userId ユーザーID
	 * @param payload 作成ペイロード
	 */
	protected abstract createEntity(
		userId: string,
		payload: CreatePayload,
	): Omit<
		T,
		| "id"
		| "sync_status"
		| "synced_at"
		| "local_updated_at"
		| "server_updated_at"
	>;

	/**
	 * バックグラウンド同期をトリガー
	 */
	protected triggerBackgroundSync(): void {
		if (!this.options.enableBackgroundSync) {
			return;
		}

		// バックグラウンドで実行（エラーはログのみ）
		syncManager.sync().catch((error) => {
			logger.error(
				`[${this.entityName}Repository] Background sync failed:`,
				error,
			);
		});
	}

	// ==========================================================================
	// 読み取り操作
	// ==========================================================================

	/**
	 * ユーザーの全エンティティを取得
	 *
	 * @param userId ユーザーID
	 * @returns エンティティの配列
	 */
	async getAll(userId: string): Promise<T[]> {
		try {
			const client = await this.getEntityClient();
			const result = await client.getAll(userId);

			// バックグラウンドで同期をトリガー
			this.triggerBackgroundSync();

			return result as T[];
		} catch (error) {
			throw new RepositoryError(
				"DB_ERROR",
				`Failed to get all ${this.entityName}`,
				{
					entityName: this.entityName,
					originalError: error instanceof Error ? error : undefined,
				},
			);
		}
	}

	/**
	 * IDでエンティティを取得
	 *
	 * @param id エンティティID
	 * @returns エンティティ、または undefined
	 */
	async getById(id: string): Promise<T | undefined> {
		try {
			const client = await this.getEntityClient();
			const result = await client.getById(id);
			return result as T | undefined;
		} catch (error) {
			throw new RepositoryError(
				"DB_ERROR",
				`Failed to get ${this.entityName} by id`,
				{
					entityId: id,
					entityName: this.entityName,
					originalError: error instanceof Error ? error : undefined,
				},
			);
		}
	}

	// ==========================================================================
	// 書き込み操作
	// ==========================================================================

	/**
	 * エンティティを作成
	 *
	 * @param userId ユーザーID
	 * @param payload 作成ペイロード
	 * @returns 作成されたエンティティ
	 */
	async create(userId: string, payload: CreatePayload): Promise<T> {
		try {
			const client = await this.getEntityClient();

			// エンティティデータを生成
			const entityData = this.createEntity(userId, payload);

			// 同期メタデータを追加
			const now = new Date().toISOString();
			const newEntity = {
				...entityData,
				id: crypto.randomUUID(),
				sync_status: "pending" as const,
				synced_at: null,
				local_updated_at: now,
				server_updated_at: null,
			};

			const result = await client.create(
				userId,
				newEntity as unknown as CreatePayload,
			);

			// バックグラウンドで同期をトリガー
			this.triggerBackgroundSync();

			return result as T;
		} catch (error) {
			throw new RepositoryError(
				"DB_ERROR",
				`Failed to create ${this.entityName}`,
				{
					entityName: this.entityName,
					originalError: error instanceof Error ? error : undefined,
				},
			);
		}
	}

	/**
	 * エンティティを更新
	 *
	 * @param id エンティティID
	 * @param updates 更新内容
	 * @returns 更新されたエンティティ
	 * @throws RepositoryError エンティティが見つからない場合
	 */
	async update(id: string, updates: Partial<T>): Promise<T> {
		try {
			const client = await this.getEntityClient();

			// 既存エンティティを確認
			const existing = await client.getById(id);
			if (!existing) {
				throw new RepositoryError(
					"NOT_FOUND",
					`${this.entityName} not found: ${id}`,
					{
						entityId: id,
						entityName: this.entityName,
					},
				);
			}

			// 同期メタデータを更新
			const now = new Date().toISOString();
			const updatedData = {
				...updates,
				sync_status: "pending" as const,
				local_updated_at: now,
			};

			const result = await client.update(id, updatedData);
			if (!result) {
				throw new RepositoryError(
					"DB_ERROR",
					`Failed to update ${this.entityName}`,
					{
						entityId: id,
						entityName: this.entityName,
					},
				);
			}

			// バックグラウンドで同期をトリガー
			this.triggerBackgroundSync();

			return result as T;
		} catch (error) {
			if (error instanceof RepositoryError) {
				throw error;
			}
			throw new RepositoryError(
				"DB_ERROR",
				`Failed to update ${this.entityName}`,
				{
					entityId: id,
					entityName: this.entityName,
					originalError: error instanceof Error ? error : undefined,
				},
			);
		}
	}

	/**
	 * エンティティを削除（論理削除）
	 *
	 * @param id エンティティID
	 * @returns 削除成功した場合 true
	 */
	async delete(id: string): Promise<boolean> {
		try {
			const client = await this.getEntityClient();

			// 既存エンティティを確認
			const existing = await client.getById(id);
			if (!existing) {
				return false;
			}

			const result = await client.delete(id);

			// バックグラウンドで同期をトリガー
			if (result) {
				this.triggerBackgroundSync();
			}

			return result;
		} catch (error) {
			throw new RepositoryError(
				"DB_ERROR",
				`Failed to delete ${this.entityName}`,
				{
					entityId: id,
					entityName: this.entityName,
					originalError: error instanceof Error ? error : undefined,
				},
			);
		}
	}

	// ==========================================================================
	// 同期操作
	// ==========================================================================

	/**
	 * 同期待ちエンティティを取得
	 *
	 * @returns 同期待ちエンティティの配列
	 */
	async getPendingSync(): Promise<T[]> {
		try {
			const client = await this.getEntityClient();
			const result = await client.getPendingSync();
			return result as T[];
		} catch (error) {
			throw new RepositoryError(
				"SYNC_ERROR",
				`Failed to get pending sync for ${this.entityName}`,
				{
					entityName: this.entityName,
					originalError: error instanceof Error ? error : undefined,
				},
			);
		}
	}

	/**
	 * エンティティを同期完了としてマーク
	 *
	 * @param id エンティティID
	 * @param serverUpdatedAt サーバーでの更新日時
	 */
	async markSynced(id: string, serverUpdatedAt: string): Promise<void> {
		try {
			const client = await this.getEntityClient();
			await client.markSynced(id, serverUpdatedAt);
		} catch (error) {
			throw new RepositoryError(
				"SYNC_ERROR",
				`Failed to mark ${this.entityName} as synced`,
				{
					entityId: id,
					entityName: this.entityName,
					originalError: error instanceof Error ? error : undefined,
				},
			);
		}
	}

	/**
	 * サーバーからのデータを同期
	 *
	 * - ローカルに存在しない場合は新規作成
	 * - ローカルが synced の場合はサーバーの値で上書き
	 * - ローカルが pending の場合はスキップ（競合解決に任せる）
	 *
	 * @param entities サーバーから取得したエンティティ
	 */
	async syncFromServer(entities: T[]): Promise<void> {
		try {
			const client = await this.getEntityClient();

			for (const serverEntity of entities) {
				const localEntity = await client.getById(serverEntity.id);

				if (!localEntity) {
					// ローカルに存在しない → 新規作成
					const syncedEntity = {
						...serverEntity,
						sync_status: "synced" as const,
						synced_at: new Date().toISOString(),
					};
					await client.overwriteWithServer(syncedEntity);
				} else if (localEntity.sync_status === "synced") {
					// ローカルが synced → サーバーの値で上書き
					const syncedEntity = {
						...serverEntity,
						sync_status: "synced" as const,
						synced_at: new Date().toISOString(),
					};
					await client.overwriteWithServer(syncedEntity);
				}
				// sync_status === 'pending' の場合はスキップ（競合解決に任せる）
			}
		} catch (error) {
			throw new RepositoryError(
				"SYNC_ERROR",
				`Failed to sync ${this.entityName} from server`,
				{
					entityName: this.entityName,
					originalError: error instanceof Error ? error : undefined,
				},
			);
		}
	}
}
