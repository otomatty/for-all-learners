"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * 指定されたノートに同名のページが存在するかチェックします。
 *
 * @example
 * ```ts
 * import { checkPageConflict } from "@/app/_actions/notes";
 *
 * const conflicts = await checkPageConflict({
 *   noteId: "note-123",
 *   pageTitle: "重複タイトル"
 * });
 *
 * if (conflicts.length > 0) {
 *   console.log("同名ページが存在します:", conflicts);
 * }
 * ```
 *
 * @param params.noteId チェック対象のノートID
 * @param params.pageTitle チェックするページタイトル
 * @param params.excludePageId 除外するページID（移動時の元ページなど）
 * @returns 競合するページの配列
 */
export async function checkPageConflict({
	noteId,
	pageTitle,
	excludePageId,
}: {
	noteId: string;
	pageTitle: string;
	excludePageId?: string;
}) {
	const supabase = await getSupabaseClient();

	// ノート内の同タイトルページを検索（内容のプレビューも含む）
	let query = supabase
		.from("pages")
		.select(`
			id, title, created_at, updated_at, content_tiptap,
			note_page_links!inner(note_id)
		`)
		.eq("note_page_links.note_id", noteId)
		.eq("title", pageTitle);

	// 除外ページがある場合
	if (excludePageId) {
		query = query.neq("id", excludePageId);
	}

	const { data: conflictPages, error } = await query;

	if (error) {
		console.error("Conflict check error:", error);
		throw error;
	}

	return conflictPages || [];
}
