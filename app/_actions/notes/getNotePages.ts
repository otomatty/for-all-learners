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
	console.log("Debug [getNotePages]: args", { slug, limit, offset, sortBy });
	const supabase = await getSupabaseClient();
	// Fetch note ID by slug
	const { data: note, error: noteError } = await supabase
		.from("notes")
		.select("id")
		.eq("slug", slug)
		.single();
	console.log("Debug [getNotePages]: note result", { note, noteError });
	if (noteError || !note) throw new Error("Note not found");

	const { data: npl, error: nplError } = await supabase
		.from("note_page_links")
		.select("page_id")
		.eq("note_id", note.id);
	console.log("Debug [getNotePages]: note_page_links", npl, nplError);

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
	console.log("Debug [getNotePages]: rpcData", rpcData);
	const pages = (rpcData?.[0]?.pages ??
		[]) as Database["public"]["Tables"]["pages"]["Row"][];
	const totalCount = rpcData?.[0]?.total_count ?? 0;
	console.log("Debug [getNotePages]: pages", pages, "totalCount", totalCount);
	return { pages, totalCount };
}
