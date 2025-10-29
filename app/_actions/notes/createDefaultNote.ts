"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ユーザーのデフォルトノートを作成します。
 *
 * @example
 * ```ts
 * import { createDefaultNote } from "@/app/_actions/notes";
 *
 * const defaultNote = await createDefaultNote(userId);
 * console.log("デフォルトノート作成:", defaultNote);
 * ```
 *
 * @param userId ユーザーID
 * @returns 作成されたデフォルトノートレコード
 */
export async function createDefaultNote(userId: string) {
	const supabase = await getSupabaseClient();

	// デフォルトノートのスラグは "all-pages" に統一
	const defaultSlug = "all-pages";

	const { data, error } = await supabase
		.from("notes")
		.insert([
			{
				owner_id: userId,
				slug: defaultSlug,
				title: "すべてのページ",
				description: "ユーザーが作成したすべてのページを含むデフォルトノート",
				visibility: "private",
			},
		])
		.select("*")
		.single();

	if (error) throw error;
	return data;
}
