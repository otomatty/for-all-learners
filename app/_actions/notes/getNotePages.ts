"use server";

import type { Database } from "@/types/database.types";
import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ノートに紐づくページをページネーション付きで取得します。
 *
 * @example
 * ```ts
 * import { getNotePages } from "@/app/_actions/notes";
 *
 * const { pages, totalCount } = await getNotePages({
 *   slug: "my-note",
 *   limit: 10,
 *   offset: 0,
 *   sortBy: "created",
 * });
 * console.log("合計ページ数:", totalCount);
 * console.log("取得したページ:", pages);
 * ```
 *
 * @param params.slug ノートのスラグ
 * @param params.limit 取得件数の上限
 * @param params.offset スキップする件数
 * @param params.sortBy 並び替えキー（"updated" | "created"）
 * @returns pages ページレコードの配列
 * @returns totalCount 合計件数
 */
export async function getNotePages({
	slug,
	limit,
	offset,
	sortBy,
}: {
	slug: string;
	limit: number;
	offset: number;
	sortBy: "updated" | "created";
}): Promise<{
	pages: Database["public"]["Tables"]["pages"]["Row"][];
	totalCount: number;
}> {
	const supabase = await getSupabaseClient();

	// Handle special "default" slug
	let note: { id: string } | null = null;
	let noteError: Error | null = null;

	if (slug === "default") {
		// Get user's default note by is_default_note flag
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) throw new Error("User not authenticated");

		const result = await supabase
			.from("notes")
			.select("id")
			.eq("owner_id", user.id)
			.eq("is_default_note", true)
			.maybeSingle();
		note = result.data;
		noteError = result.error;
	} else {
		// Fetch note ID by slug
		const result = await supabase
			.from("notes")
			.select("id")
			.eq("slug", slug)
			.single();
		note = result.data;
		noteError = result.error;
	}

	if (noteError || !note) throw new Error("Note not found");

	// Fetch pages via RPC
	const { data: rpcData, error: rpcError } = await supabase.rpc(
		"get_note_pages",
		{
			p_note_id: note.id,
			p_limit: limit,
			p_offset: offset,
			p_sort: sortBy,
		},
	);
	if (rpcError) throw rpcError;
	const pages = (rpcData?.[0]?.pages ??
		[]) as Database["public"]["Tables"]["pages"]["Row"][];
	const totalCount = rpcData?.[0]?.total_count ?? 0;
	return { pages, totalCount };
}
