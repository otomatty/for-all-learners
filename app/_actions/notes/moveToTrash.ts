"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * 指定されたページをゴミ箱に移動します（ソフト削除）。
 *
 * @example
 * ```ts
 * import { moveToTrash } from "@/app/_actions/notes";
 *
 * const result = await moveToTrash({
 *   pageIds: ["page1", "page2"],
 *   noteId: "note-123"
 * });
 * ```
 *
 * @param params.pageIds ゴミ箱に移動するページID配列
 * @param params.noteId 元のノートID
 * @returns 処理結果
 */
export async function moveToTrash({
	pageIds,
	noteId
}: {
	pageIds: string[];
	noteId: string;
}) {
	const supabase = await getSupabaseClient();

	try {
		// 現在のユーザーIDを取得
		const { data: { user }, error: userError } = await supabase.auth.getUser();
		if (userError || !user) {
			throw new Error("認証が必要です");
		}

		// ページの詳細情報を取得
		const { data: pages, error: pagesError } = await supabase
			.from("pages")
			.select("id, title, content")
			.in("id", pageIds);

		if (pagesError) throw pagesError;
		if (!pages || pages.length === 0) {
			throw new Error("ページが見つかりません");
		}

		// 各ページをゴミ箱に移動
		for (const page of pages) {
			// ゴミ箱テーブルに追加
			const { error: trashError } = await supabase
				.from("page_trash")
				.insert({
					page_id: page.id,
					user_id: user.id,
					original_note_id: noteId,
					page_title: page.title,
					page_content: page.content,
					metadata: {
						deleted_from_note: noteId,
						deleted_by: user.id
					}
				});

			if (trashError) throw trashError;

			// note_page_linksからリンクを削除
			const { error: unlinkError } = await supabase
				.from("note_page_links")
				.delete()
				.eq("note_id", noteId)
				.eq("page_id", page.id);

			if (unlinkError) throw unlinkError;
		}

		return {
			success: true,
			deletedCount: pages.length,
			message: `${pages.length}件のページをゴミ箱に移動しました`
		};

	} catch (error) {
		console.error("Move to trash error:", error);
		return {
			success: false,
			deletedCount: 0,
			message: error instanceof Error ? error.message : "ゴミ箱への移動に失敗しました"
		};
	}
}