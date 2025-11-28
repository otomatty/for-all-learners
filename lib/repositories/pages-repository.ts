/**
 * Pages Repository
 *
 * Pages データの CRUD 操作と Pages 固有のクエリを提供
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ hooks/pages/*.ts
 *
 * Dependencies:
 *   ├─ lib/repositories/base-repository.ts
 *   ├─ lib/repositories/types.ts
 *   └─ lib/db/types.ts
 *
 * Spec: lib/repositories/pages-repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/196
 */

import type {
	CreatePagePayload,
	LocalPage,
	UpdatePagePayload,
} from "@/lib/db/types";
import { BaseRepository, RepositoryError } from "./base-repository";
import type { EntityName, RepositoryOptions } from "./types";

/**
 * Pages Repository
 *
 * Pages データの CRUD 操作を提供
 *
 * 注意: content_tiptap フィールドはリアルタイム同期（Yjs）で管理されるため、
 * ローカルDBには保存しない
 */
export class PagesRepository extends BaseRepository<
	LocalPage,
	CreatePagePayload
> {
	protected entityName: EntityName = "pages";

	/**
	 * コンストラクタ
	 *
	 * @param options Repository オプション
	 */
	constructor(options: RepositoryOptions = {}) {
		super(options);
	}

	/**
	 * 作成ペイロードからページエンティティを生成
	 */
	protected createEntity(
		userId: string,
		payload: CreatePagePayload,
	): Omit<
		LocalPage,
		| "id"
		| "sync_status"
		| "synced_at"
		| "local_updated_at"
		| "server_updated_at"
	> {
		const now = new Date().toISOString();
		return {
			user_id: userId,
			note_id: payload.note_id ?? null,
			title: payload.title,
			thumbnail_url: payload.thumbnail_url ?? null,
			is_public: payload.is_public ?? false,
			scrapbox_page_id: null,
			scrapbox_page_list_synced_at: null,
			scrapbox_page_content_synced_at: null,
			created_at: now,
			updated_at: now,
		};
	}

	// ==========================================================================
	// Pages 固有のメソッド
	// ==========================================================================

	/**
	 * ノート内のページ一覧を取得
	 *
	 * @param noteId ノートID
	 * @returns ページの配列
	 */
	async getByNoteId(noteId: string): Promise<LocalPage[]> {
		try {
			const db = await this.getDB();
			const pages = await db.pages.getByNote(noteId);
			return pages;
		} catch (error) {
			throw new RepositoryError("DB_ERROR", `Failed to get pages by note id`, {
				entityName: this.entityName,
				originalError: error instanceof Error ? error : undefined,
			});
		}
	}

	/**
	 * ページのメタデータのみを更新
	 *
	 * content_tiptap はリアルタイム同期で管理されるため、
	 * このメソッドではメタデータのみを更新する
	 *
	 * @param id ページID
	 * @param updates 更新内容（title, note_id, is_public, thumbnail_url）
	 * @returns 更新されたページ
	 */
	async updateMetadata(
		id: string,
		updates: Pick<
			UpdatePagePayload,
			"title" | "note_id" | "is_public" | "thumbnail_url"
		>,
	): Promise<LocalPage> {
		return this.update(id, updates);
	}
}

/**
 * PagesRepository のシングルトンインスタンス
 */
export const pagesRepository = new PagesRepository();
