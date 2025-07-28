"use server";

import { randomUUID } from "node:crypto";
import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ノート用の共有リンクを生成します。
 *
 * @example
 * ```ts
 * import { generateNoteShareLink } from "@/app/_actions/notes";
 *
 * const linkRecord = await generateNoteShareLink("note-id-123", "viewer");
 * console.log("生成されたリンク:", linkRecord.token);
 * ```
 *
 * @param noteId リンクを生成する対象のノートID
 * @param permission リンクの権限レベル（"viewer"）
 * @returns 生成された共有リンクレコード
 */
export async function generateNoteShareLink(
	noteId: string,
	permission: "viewer",
) {
	const supabase = await getSupabaseClient();
	const token = randomUUID();
	const { data, error } = await supabase
		.from("share_links")
		.insert([
			{
				resource_type: "note",
				resource_id: noteId,
				token,
				permission_level: permission,
			},
		])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}
