"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ユーザーにノートを共有します。
 *
 * @example
 * ```ts
 * import { shareNote } from "@/app/_actions/notes";
 *
 * const shareRecord = await shareNote("note-id-123", "user-id-456", "viewer");
 * console.log("共有レコード:", shareRecord);
 * ```
 *
 * @param noteId 共有対象のノートID
 * @param userId 共有先のユーザーID
 * @param permission 権限レベル（"editor" | "viewer"）
 * @returns 作成された共有レコード
 */
export async function shareNote(
	noteId: string,
	userId: string,
	permission: "editor" | "viewer",
) {
	const supabase = await getSupabaseClient();
	const { data, error } = await supabase
		.from("note_shares")
		.insert([
			{
				note_id: noteId,
				shared_with_user_id: userId,
				permission_level: permission,
			},
		])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}
