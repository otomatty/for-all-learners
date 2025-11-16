"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

/**
 * ノート内のページ一覧を取得します。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ [使用しているファイルがあれば記載]
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   └─ @/lib/supabase/client
 *
 * Related Documentation:
 *   └─ docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function usePagesByNote(noteId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", "by-note", noteId],
		queryFn: async () => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("note_page_links")
				.select("pages(*)")
				.eq("note_id", noteId);

			if (error) throw error;

			// Extract pages from note_page_links result
			const pages =
				data
					?.map((link) => link.pages)
					.filter(
						(page): page is Database["public"]["Tables"]["pages"]["Row"] =>
							page !== null,
					) ?? [];

			return pages;
		},
		enabled: !!noteId,
	});
}
