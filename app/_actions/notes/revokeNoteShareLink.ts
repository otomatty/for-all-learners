"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * 共有リンクを無効化（失効）します。
 *
 * @example
 * ```ts
 * import { revokeNoteShareLink } from "@/app/_actions/notes";
 *
 * await revokeNoteShareLink("token-abc123");
 * console.log("リンクを無効化しました");
 * ```
 *
 * @param token 無効化する共有リンクのトークン
 */
export async function revokeNoteShareLink(token: string) {
	const supabase = await getSupabaseClient();
	const { error } = await supabase
		.from("share_links")
		.update({ expires_at: new Date().toISOString() })
		.eq("token", token);
	if (error) throw error;
}
