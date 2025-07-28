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

	// デフォルトノートのスラグを生成（ユーザーIDをベースに）
	const defaultSlug = `default-${userId.slice(0, 8)}`;

	const { data, error } = await supabase
		.from("notes")
		.insert([
			{
				owner_id: userId,
				slug: defaultSlug,
				title: "マイノート",
				description: "デフォルトのノートです。ページを自由に整理できます。",
				visibility: "private",
			},
		])
		.select("*")
		.single();

	if (error) throw error;
	return data;
}
