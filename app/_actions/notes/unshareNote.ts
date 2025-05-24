"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ノートの共有を解除します。
 *
 * @example
 * ```ts
 * import { unshareNote } from "@/app/_actions/notes";
 *
 * await unshareNote("note-id-123", "user-id-456");
 * console.log("共有を解除しました");
 * ```
 *
 * @param noteId 共有解除対象のノートID
 * @param userId 共有を解除するユーザーID
 */
export async function unshareNote(noteId: string, userId: string) {
	const supabase = await getSupabaseClient();
	const { error } = await supabase
		.from("note_shares")
		.delete()
		.eq("note_id", noteId)
		.eq("shared_with_user_id", userId);
	if (error) throw error;
}
