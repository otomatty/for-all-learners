/**
 * Notes Repository
 *
 * Notes データの CRUD 操作と Notes 固有のクエリを提供
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this module):
 *   └─ hooks/notes/*.ts
 *
 * Dependencies:
 *   ├─ lib/repositories/base-repository.ts
 *   ├─ lib/repositories/types.ts
 *   └─ lib/db/types.ts
 *
 * Spec: lib/repositories/notes-repository.spec.md
 * Issue: https://github.com/otomatty/for-all-learners/issues/196
 */

import type { CreateNotePayload, LocalNote } from "@/lib/db/types";
import { BaseRepository } from "./base-repository";
import type { EntityName, RepositoryOptions } from "./types";

/**
 * Notes Repository
 *
 * Notes データの CRUD 操作を提供
 */
export class NotesRepository extends BaseRepository<
	LocalNote,
	CreateNotePayload
> {
	protected entityName: EntityName = "notes";

	/**
	 * コンストラクタ
	 *
	 * @param options Repository オプション
	 */
	constructor(options: RepositoryOptions = {}) {
		super(options);
	}

	/**
	 * 作成ペイロードからノートエンティティを生成
	 */
	protected createEntity(
		userId: string,
		payload: CreateNotePayload,
	): Omit<
		LocalNote,
		| "id"
		| "sync_status"
		| "synced_at"
		| "local_updated_at"
		| "server_updated_at"
	> {
		const now = new Date().toISOString();
		return {
			owner_id: userId,
			slug: payload.slug,
			title: payload.title,
			description: payload.description ?? null,
			visibility: payload.visibility ?? "private",
			created_at: now,
			updated_at: now,
			page_count: 0,
			participant_count: 1,
			is_default_note: false,
		};
	}

	// ==========================================================================
	// Notes 固有のメソッド
	// ==========================================================================

	/**
	 * スラッグでノートを取得
	 *
	 * @param userId ユーザーID
	 * @param slug ノートのスラッグ
	 * @returns ノート、または undefined
	 */
	async getBySlug(
		userId: string,
		slug: string,
	): Promise<LocalNote | undefined> {
		const notes = await this.getAll(userId);
		return notes.find((note) => note.slug === slug);
	}

	/**
	 * デフォルトノートを取得
	 *
	 * @param userId ユーザーID
	 * @returns デフォルトノート、または undefined
	 */
	async getDefaultNote(userId: string): Promise<LocalNote | undefined> {
		const notes = await this.getAll(userId);
		return notes.find((note) => note.is_default_note === true);
	}
}

/**
 * NotesRepository のシングルトンインスタンス
 */
export const notesRepository = new NotesRepository();
