"use server";

import { getSupabaseClient } from "./getSupabaseClient";
import type { UpdateNotePayload } from "./types";

/**
 * ノートを更新します。
 *
 * @example
 * ```ts
 * import { updateNote } from "@/app/_actions/notes";
 *
 * const updatedNote = await updateNote("note-id-123", {
 *   title: "更新後のタイトル",
 *   visibility: "public",
 * });
 * console.log("更新されたノート:", updatedNote);
 * ```
 *
 * @param id 更新対象のノートID
 * @param payload 更新フィールドのオブジェクト
 * @param payload.slug 新しいスラグ（省略可）
 * @param payload.title 新しいタイトル（省略可）
 * @param payload.description 新しい説明（省略可）
 * @param payload.visibility 新しい公開範囲（"public" | "unlisted" | "invite" | "private"）（省略可）
 * @returns 更新後のノートレコード
 */
export async function updateNote(id: string, payload: UpdateNotePayload) {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	const { data: existing, error: fetchError } = await supabase
		.from("notes")
		.select("visibility")
		.eq("id", id)
		.single();
	if (fetchError || !existing) throw fetchError;

	const oldVisibility = existing.visibility;
	const newVisibility = payload.visibility;

	const { data: updated, error: updateError } = await supabase
		.from("notes")
		.update(payload)
		.eq("id", id)
		.select("*")
		.single();
	if (updateError) throw updateError;

	// If visibility changed, clear existing shares and links
	if (newVisibility && newVisibility !== oldVisibility) {
		const { error: delSharesError } = await supabase
			.from("note_shares")
			.delete()
			.eq("note_id", id)
			.neq("shared_with_user_id", user.id);
		if (delSharesError) throw delSharesError;

		const { error: delLinksError } = await supabase
			.from("share_links")
			.delete()
			.eq("resource_type", "note")
			.eq("resource_id", id);
		if (delLinksError) throw delLinksError;
	}

	return updated;
}
