"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * 指定したノートの共有リンク一覧を取得します。
 *
 * @param noteId 取得対象のノートID
 * @returns share_links レコードの配列
 */
export async function getNoteShareLinks(noteId: string) {
	const supabase = await getSupabaseClient();
	const { data, error } = await supabase
		.from("share_links")
		.select("token, permission_level, created_at, expires_at")
		.eq("resource_type", "note")
		.eq("resource_id", noteId);
	if (error) throw error;
	return data;
}
