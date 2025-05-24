"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ノートからページの紐付けを解除します。
 *
 * @example
 * ```ts
 * import { unlinkPageFromNote } from "@/app/_actions/notes";
 *
 * await unlinkPageFromNote("note-id-123", "page-id-456");
 * console.log("ページの紐付けを解除しました");
 * ```
 *
 * @param noteId 紐付け解除するノートのID
 * @param pageId 紐付け解除するページのID
 */
export async function unlinkPageFromNote(noteId: string, pageId: string) {
	const supabase = await getSupabaseClient();
	const { error } = await supabase
		.from("note_page_links")
		.delete()
		.eq("note_id", noteId)
		.eq("page_id", pageId);
	if (error) throw error;
}
