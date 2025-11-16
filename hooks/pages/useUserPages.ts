"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type UserPageSummary = {
	id: string;
	title: string;
};

/**
 * ユーザーのページ一覧（IDとタイトルのみ）を取得します。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/_components/CardList/CardsList.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   └─ @/lib/supabase/client
 *
 * Related Documentation:
 *   └─ docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function useUserPages(userId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", "user", userId],
		queryFn: async (): Promise<UserPageSummary[]> => {
			const { data, error } = await supabase
				.from("pages")
				.select("id,title")
				.eq("user_id", userId);
			if (error) throw error;
			return data ?? [];
		},
		enabled: !!userId,
	});
}

