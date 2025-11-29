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
import { BaseRepository, RepositoryError } from "./base-repository";
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

	/**
	 * デフォルトノートを作成
	 *
	 * ベースクラスの create() メソッドを使用し、
	 * is_default_note フラグを true に設定します。
	 *
	 * @param userId ユーザーID
	 * @returns 作成されたデフォルトノート
	 */
	async createDefaultNote(userId: string): Promise<LocalNote> {
		const defaultNotePayload: CreateNotePayload = {
			slug: "all-pages",
			title: "すべてのページ",
			description: "ユーザーが作成したすべてのページを含むデフォルトノート",
			visibility: "private",
		};

		// ベースクラスの create() を使用
		const note = await this.create(userId, defaultNotePayload);

		// is_default_note フラグを true に更新
		return await this.update(note.id, {
			is_default_note: true,
		} as Partial<LocalNote>);
	}

	/**
	 * ノートを削除
	 *
	 * デフォルトノートは削除できません。
	 * 削除操作はベースクラスの delete() にビジネスロジックを追加しています。
	 *
	 * @param id ノートID
	 * @throws RepositoryError デフォルトノートを削除しようとした場合
	 */
	async delete(id: string): Promise<void> {
		// 削除対象のノートを取得
		const note = await this.getById(id);

		if (!note) {
			throw new RepositoryError("NOT_FOUND", `Note not found: ${id}`, {
				entityId: id,
				entityName: this.entityName,
			});
		}

		// デフォルトノートは削除不可
		if (note.is_default_note) {
			throw new RepositoryError("FORBIDDEN", "Cannot delete the default note", {
				entityId: id,
				entityName: this.entityName,
			});
		}

		// ベースクラスの delete() を呼び出し
		await super.delete(id);
	}
}

/**
 * NotesRepository のシングルトンインスタンス
 */
export const notesRepository = new NotesRepository();
