"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ページをノートに紐付けます。
 *
 * @example
 * ```ts
 * import { linkPageToNote } from "@/app/_actions/notes";
 *
 * const linkRecord = await linkPageToNote("note-id-123", "page-id-456");
 * console.log("リンクレコード:", linkRecord);
 * ```
 *
 * @param noteId 紐付けたいノートのID
 * @param pageId 紐付けたいページのID
 * @returns 作成されたリンクレコード
 */
export async function linkPageToNote(noteId: string, pageId: string) {
	const supabase = await getSupabaseClient();
	const { data, error } = await supabase
		.from("note_page_links")
		.insert([{ note_id: noteId, page_id: pageId }])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}
