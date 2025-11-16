"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type SharedPage = Database["public"]["Tables"]["page_shares"]["Row"] & {
	pages: Database["public"]["Tables"]["pages"]["Row"];
};

/**
 * ユーザーに共有されたページ一覧を取得します。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ [使用しているファイルがあれば記載]
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   ├─ @/lib/supabase/client
 *   └─ @/types/database.types
 *
 * Related Documentation:
 *   └─ docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function useSharedPages() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", "shared"],
		queryFn: async (): Promise<SharedPage[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("page_shares")
				.select("*, pages(*)")
				.eq("shared_with_user_id", user.id)
				.order("pages(updated_at)", { ascending: false });
			if (error) throw error;
			return data as SharedPage[];
		},
	});
}
