"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ノートを削除します。
 *
 * @example
 * ```ts
 * import { deleteNote } from "@/app/_actions/notes";
 *
 * await deleteNote("note-id-123");
 * console.log("ノートを削除しました");
 * ```
 *
 * @param id 削除対象のノートID
 */
export async function deleteNote(id: string) {
	const supabase = await getSupabaseClient();
	const { error } = await supabase.from("notes").delete().eq("id", id);
	if (error) throw error;
}
