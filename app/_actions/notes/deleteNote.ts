"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ノートを削除します。
 * デフォルトノート（is_default_note = true）は削除できません。
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
 * @throws Error デフォルトノートを削除しようとした場合、または削除に失敗した場合
 */
export async function deleteNote(id: string) {
	const supabase = await getSupabaseClient();

	// Check if the note is a default note
	const { data: note, error: fetchError } = await supabase
		.from("notes")
		.select("is_default_note")
		.eq("id", id)
		.single();

	if (fetchError) {
		throw new Error("ノートの情報取得に失敗しました。");
	}

	if (note?.is_default_note) {
		throw new Error("デフォルトノートは削除できません。");
	}

	// Delete the note
	const { error } = await supabase.from("notes").delete().eq("id", id);
	if (error) throw error;
}
