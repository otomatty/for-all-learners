"use server";

import { createDefaultNote } from "./createDefaultNote";
import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ユーザーのデフォルトノートを取得します。存在しない場合は自動作成します。
 *
 * @example
 * ```ts
 * import { getDefaultNote } from "@/app/_actions/notes";
 *
 * const defaultNote = await getDefaultNote();
 * console.log("デフォルトノート:", defaultNote);
 * ```
 *
 * @returns ユーザーのデフォルトノートレコード
 */
export async function getDefaultNote() {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	// デフォルトノートのスラグパターンで検索
	const defaultSlug = `default-${user.id.slice(0, 8)}`;

	const { data: existingNote, error: fetchError } = await supabase
		.from("notes")
		.select("*")
		.eq("owner_id", user.id)
		.eq("slug", defaultSlug)
		.maybeSingle();

	if (fetchError) throw fetchError;

	// 既存のデフォルトノートがある場合はそれを返す
	if (existingNote) {
		return existingNote;
	}

	// デフォルトノートが存在しない場合は作成
	return await createDefaultNote(user.id);
}
