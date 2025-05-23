"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * 共有リンクからノートに参加（共有）します。
 *
 * @example
 * ```ts
 * import { joinNoteByLink } from "@/app/_actions/notes";
 *
 * const joinRecord = await joinNoteByLink("token-abc123");
 * console.log("参加レコード:", joinRecord);
 * ```
 *
 * @param token 共有リンクのトークン
 * @returns 参加したノートの共有レコード
 */
export async function joinNoteByLink(token: string) {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	const { data: link, error: linkError } = await supabase
		.from("share_links")
		.select("resource_id, resource_type, permission_level, expires_at")
		.eq("token", token)
		.single();
	if (linkError) throw linkError;
	if (link.resource_type !== "note") throw new Error("Invalid resource type");
	if (link.expires_at && new Date(link.expires_at) < new Date())
		throw new Error("Link has expired");

	const { data, error } = await supabase
		.from("note_shares")
		.insert([
			{
				note_id: link.resource_id,
				shared_with_user_id: user.id,
				permission_level: link.permission_level,
			},
		])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}
