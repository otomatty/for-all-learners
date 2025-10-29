"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ユーザーの全ページ（IDとタイトルのみ）を取得します。
 * ページリンク機能のためのタイトル→IDマッピング作成に使用。
 *
 * @example
 * ```ts
 * import { getAllUserPages } from "@/app/_actions/notes";
 *
 * const pages = await getAllUserPages(userId);
 * const pagesMap = new Map(pages.map(p => [p.title, p.id]));
 * ```
 *
 * @param userId ユーザーID
 * @returns ページの配列（id, title のみ）
 */
export async function getAllUserPages(
	userId: string,
): Promise<Array<{ id: string; title: string }>> {
	const supabase = await getSupabaseClient();

	const { data, error } = await supabase
		.from("pages")
		.select("id, title")
		.eq("user_id", userId);

	if (error) throw error;

	return data ?? [];
}
