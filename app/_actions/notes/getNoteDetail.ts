"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ノートの詳細情報（メタデータ）を取得します。
 *
 * @example
 * ```ts
 * import { getNoteDetail } from "@/app/_actions/notes";
 *
 * const detail = await getNoteDetail("my-note");
 * console.log("ノート詳細:", detail.note);
 * ```
 *
 * @param slug 取得するノートのスラグ
 * @returns note オブジェクト（id, slug, title, description, visibility, updated_at, page_count, participant_count）
 */
export async function getNoteDetail(slug: string) {
	const supabase = await getSupabaseClient();
	// Fetch note metadata
	const { data: note, error: noteError } = await supabase
		.from("notes")
		.select(
			"id, slug, title, description, visibility, created_at, updated_at, page_count, participant_count, owner_id, is_default_note",
		)
		.eq("slug", slug)
		.single();
	if (noteError || !note) throw noteError || new Error("Note not found");
	// Only return note metadata; page listing handled client-side via API
	return { note };
}
