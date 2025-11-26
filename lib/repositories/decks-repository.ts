/**
 * Decks Repository
 *
 * Decks データの CRUD 操作と Decks 固有のクエリを提供
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ hooks/decks/*.ts
 *
 * Dependencies:
 *   ├─ lib/repositories/base-repository.ts
 *   ├─ lib/repositories/types.ts
 *   └─ lib/db/types.ts
 *
 * Spec: lib/repositories/decks-repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/197
 */

import type { CreateDeckPayload, LocalDeck } from "@/lib/db/types";
import { BaseRepository } from "./base-repository";
import type { EntityName, RepositoryOptions } from "./types";

/**
 * Decks Repository
 *
 * Decks データの CRUD 操作を提供
 */
export class DecksRepository extends BaseRepository<
	LocalDeck,
	CreateDeckPayload
> {
	protected entityName: EntityName = "decks";

	/**
	 * コンストラクタ
	 *
	 * @param options Repository オプション
	 */
	constructor(options: RepositoryOptions = {}) {
		super(options);
	}

	/**
	 * 作成ペイロードからデッキエンティティを生成
	 */
	protected createEntity(
		userId: string,
		payload: CreateDeckPayload,
	): Omit<
		LocalDeck,
		| "id"
		| "sync_status"
		| "synced_at"
		| "local_updated_at"
		| "server_updated_at"
	> {
		const now = new Date().toISOString();
		return {
			user_id: userId,
			title: payload.title,
			description: payload.description ?? null,
			is_public: payload.is_public ?? false,
			created_at: now,
			updated_at: now,
		};
	}
}

/**
 * DecksRepository のシングルトンインスタンス
 */
export const decksRepository = new DecksRepository();
