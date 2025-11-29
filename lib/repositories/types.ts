/**
 * Repository 型定義
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   ├─ lib/repositories/base-repository.ts
 *   ├─ lib/repositories/notes-repository.ts
 *   ├─ lib/repositories/pages-repository.ts
 *   ├─ lib/repositories/decks-repository.ts
 *   └─ lib/repositories/cards-repository.ts
 *
 * Dependencies:
 *   └─ lib/db/types.ts
 *
 * Spec: lib/repositories/repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/195
 */

import type { SyncableEntity } from "@/lib/db/types";

// ============================================================================
// 同期メタデータのキー
// ============================================================================

/**
 * 同期メタデータのキー（除外対象）
 */
export type SyncMetadataKeys =
	| "sync_status"
	| "synced_at"
	| "local_updated_at"
	| "server_updated_at";

// ============================================================================
// Repository インターフェース
// ============================================================================

/**
 * Repository 基本インターフェース
 *
 * @template T エンティティの型（SyncableEntityを継承）
 * @template CreatePayload 作成時のペイロード型
 */
export interface Repository<
	T extends SyncableEntity,
	CreatePayload = Omit<T, "id" | SyncMetadataKeys>,
> {
	/**
	 * ユーザーの全エンティティを取得
	 * @param userId ユーザーID
	 */
	getAll(userId: string): Promise<T[]>;

	/**
	 * IDでエンティティを取得
	 * @param id エンティティID
	 */
	getById(id: string): Promise<T | undefined>;

	/**
	 * エンティティを作成
	 * @param userId ユーザーID
	 * @param payload 作成ペイロード
	 */
	create(userId: string, payload: CreatePayload): Promise<T>;

	/**
	 * エンティティを更新
	 * @param id エンティティID
	 * @param updates 更新内容
	 */
	update(id: string, updates: Partial<T>): Promise<T>;

	/**
	 * エンティティを削除（論理削除）
	 * @param id エンティティID
	 */
	delete(id: string): Promise<boolean>;

	/**
	 * 同期待ちエンティティを取得
	 */
	getPendingSync(): Promise<T[]>;

	/**
	 * エンティティを同期完了としてマーク
	 * @param id エンティティID
	 * @param serverUpdatedAt サーバーでの更新日時
	 */
	markSynced(id: string, serverUpdatedAt: string): Promise<void>;

	/**
	 * サーバーからのデータを同期
	 * @param entities サーバーから取得したエンティティ
	 */
	syncFromServer(entities: T[]): Promise<void>;
}

// ============================================================================
// Repository オプション
// ============================================================================

/**
 * Repository のオプション
 */
export interface RepositoryOptions {
	/**
	 * バックグラウンド同期を有効にするか
	 * @default true
	 */
	enableBackgroundSync?: boolean;

	/**
	 * 同期完了時のコールバック
	 */
	onSyncComplete?: () => void;
}

/**
 * デフォルトのRepositoryオプション
 */
export const DEFAULT_REPOSITORY_OPTIONS: Required<RepositoryOptions> = {
	enableBackgroundSync: true,
	onSyncComplete: () => {},
};

// ============================================================================
// エラー
// ============================================================================

/**
 * Repository エラーコード
 */
export type RepositoryErrorCode =
	| "NOT_FOUND"
	| "FORBIDDEN"
	| "VALIDATION_ERROR"
	| "DB_ERROR"
	| "SYNC_ERROR";

/**
 * Repository エラーの詳細
 */
export interface RepositoryErrorDetails {
	/** エンティティID（あれば） */
	entityId?: string;
	/** エンティティ名 */
	entityName?: string;
	/** 元のエラー */
	originalError?: Error;
}

// ============================================================================
// エンティティ名マッピング
// ============================================================================

/**
 * サポートするエンティティ名
 */
export type EntityName =
	| "notes"
	| "pages"
	| "decks"
	| "cards"
	| "studyGoals"
	| "learningLogs"
	| "milestones"
	| "userSettings";
