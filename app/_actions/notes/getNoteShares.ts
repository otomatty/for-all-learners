"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * 指定したノートの共有ユーザー一覧を取得します。
 *
 * @param noteId 取得対象のノートID
 * @returns note_shares レコードの配列
 */
export async function getNoteShares(noteId: string) {
	const supabase = await getSupabaseClient();
	const { data, error } = await supabase
		.from("note_shares")
		.select("shared_with_user_id, permission_level, created_at")
		.eq("note_id", noteId);
	if (error) throw error;
	return data;
}
