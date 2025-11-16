"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export interface UseNotePagesParams {
	slug: string;
	limit: number;
	offset: number;
	sortBy: "updated" | "created";
}

/**
 * ノートに紐づくページをページネーション付きで取得します。
 */
export function useNotePages(params: UseNotePagesParams) {
	const supabase = createClient();

	return useQuery({
		queryKey: [
			"note-pages",
			params.slug,
			params.limit,
			params.offset,
			params.sortBy,
		],
		queryFn: async (): Promise<{
			pages: Database["public"]["Tables"]["pages"]["Row"][];
			totalCount: number;
		}> => {
			// Handle special "default" slug
			let note: { id: string } | null = null;
			let noteError: Error | null = null;

			if (params.slug === "default") {
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
					.eq("slug", params.slug)
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
					p_limit: params.limit,
					p_offset: params.offset,
					p_sort: params.sortBy,
				},
			);
			if (rpcError) throw rpcError;
			const pages = (rpcData?.[0]?.pages ??
				[]) as Database["public"]["Tables"]["pages"]["Row"][];
			const totalCount = rpcData?.[0]?.total_count ?? 0;
			return { pages, totalCount };
		},
		enabled: !!params.slug,
	});
}
