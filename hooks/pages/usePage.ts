"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ページ詳細を取得します。
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
export function usePage(id: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", id],
		queryFn: async () => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("pages")
				.select("*")
				.eq("id", id)
				.single();
			if (error) throw error;
			return data;
		},
		enabled: !!id,
	});
}
