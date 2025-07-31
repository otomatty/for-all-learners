"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ページを完全に削除します（元に戻せません）。
 *
 * @example
 * ```ts
 * import { deletePagesPermanently } from "@/app/_actions/notes";
 *
 * const result = await deletePagesPermanently({
 *   pageIds: ["page1", "page2"]
 * });
 * ```
 *
 * @param params.pageIds 完全削除するページID配列
 * @returns 処理結果
 */
export async function deletePagesPermanently({
	pageIds
}: {
	pageIds: string[];
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
			.select("id, title")
			.in("id", pageIds);

		if (pagesError) throw pagesError;
		if (!pages || pages.length === 0) {
			throw new Error("ページが見つかりません");
		}

		// ページに関連するゴミ箱エントリを削除
		const { error: trashDeleteError } = await supabase
			.from("page_trash")
			.delete()
			.in("page_id", pageIds)
			.eq("user_id", user.id);

		if (trashDeleteError) throw trashDeleteError;

		// note_page_linksからリンクを削除
		const { error: linkDeleteError } = await supabase
			.from("note_page_links")
			.delete()
			.in("page_id", pageIds);

		if (linkDeleteError) throw linkDeleteError;

		// ページ自体を削除
		const { error: pageDeleteError } = await supabase
			.from("pages")
			.delete()
			.in("id", pageIds);

		if (pageDeleteError) throw pageDeleteError;

		return {
			success: true,
			deletedCount: pages.length,
			message: `${pages.length}件のページを完全に削除しました`
		};

	} catch (error) {
		console.error("Permanent delete error:", error);
		return {
			success: false,
			deletedCount: 0,
			message: error instanceof Error ? error.message : "完全削除に失敗しました"
		};
	}
}