"use server";

import { getSupabaseClient } from "./getSupabaseClient";
import { linkPageToNote } from "./linkPageToNote";

/**
 * ゴミ箱からページを復元します。
 *
 * @example
 * ```ts
 * import { restoreFromTrash } from "@/app/_actions/notes";
 *
 * const result = await restoreFromTrash({
 *   trashIds: ["trash1", "trash2"],
 *   targetNoteId: "note-123"
 * });
 * ```
 *
 * @param params.trashIds 復元するゴミ箱アイテムのID配列
 * @param params.targetNoteId 復元先のノートID（省略時は元のノート）
 * @returns 処理結果
 */
export async function restoreFromTrash({
	trashIds,
	targetNoteId
}: {
	trashIds: string[];
	targetNoteId?: string;
}) {
	const supabase = await getSupabaseClient();

	try {
		// 現在のユーザーIDを取得
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		if (userError || !user) {
			throw new Error("認証が必要です");
		}

		// ゴミ箱アイテムの詳細情報を取得
		const { data: trashItems, error: trashError } = await supabase
			.from("page_trash")
			.select("*")
			.in("id", trashIds)
			.eq("user_id", user.id);

		if (trashError) throw trashError;
		if (!trashItems || trashItems.length === 0) {
			throw new Error("ゴミ箱アイテムが見つかりません");
		}

		const restoredPages: string[] = [];

		for (const trashItem of trashItems) {
			// 復元先ノートIDを決定（指定がない場合は元のノート）
			const restoreNoteId = targetNoteId || trashItem.original_note_id;
			
			if (!restoreNoteId) {
				throw new Error(`ページ "${trashItem.page_title}" の復元先ノートが特定できません`);
			}

			// ページが削除されていないか確認
			const { data: pageExists, error: pageCheckError } = await supabase
				.from("pages")
				.select("id")
				.eq("id", trashItem.page_id)
				.single();

			if (pageCheckError && pageCheckError.code !== 'PGRST116') {
				throw pageCheckError;
			}

			if (!pageExists) {
				// ページが完全に削除されている場合は新規作成
				const { data: newPage, error: createError } = await supabase
					.from("pages")
					.insert({
						title: trashItem.page_title,
						content: trashItem.page_content || "",
					})
					.select("id")
					.single();

				if (createError) throw createError;
				
				// 新しいページIDでノートにリンク
				await linkPageToNote(restoreNoteId, newPage.id);
				restoredPages.push(newPage.id);
			} else {
				// ページが存在する場合はノートにリンク
				await linkPageToNote(restoreNoteId, trashItem.page_id);
				restoredPages.push(trashItem.page_id);
			}

			// ゴミ箱から削除
			const { error: deleteTrashError } = await supabase
				.from("page_trash")
				.delete()
				.eq("id", trashItem.id);

			if (deleteTrashError) throw deleteTrashError;
		}

		return {
			success: true,
			restoredCount: restoredPages.length,
			restoredPages,
			message: `${restoredPages.length}件のページを復元しました`
		};

	} catch (error) {
		console.error("Restore from trash error:", error);
		return {
			success: false,
			restoredCount: 0,
			restoredPages: [],
			message: error instanceof Error ? error.message : "復元に失敗しました"
		};
	}
}