"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ページ訪問を記録するフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/notes/[slug]/[id]/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   └─ @/lib/supabase/client
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function useRecordPageVisit() {
	const queryClient = useQueryClient();
	const supabase = createClient();

	return useMutation<Date | null, Error, string>({
		mutationFn: async (pageId: string): Promise<Date | null> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				return null;
			}

			const now = new Date().toISOString();

			const { data, error } = await supabase
				.from("user_page_visits")
				.upsert(
					{
						user_id: user.id,
						page_id: pageId,
						last_visited_at: now,
					},
					{
						onConflict: "user_id,page_id",
					},
				)
				.select("last_visited_at")
				.single();

			if (error || !data) {
				return null;
			}

			// キャッシュを無効化
			queryClient.invalidateQueries({
				queryKey: ["page-visits", pageId],
			});

			return data.last_visited_at ? new Date(data.last_visited_at) : new Date();
		},
	});
}

/**
 * ページの最終訪問時刻を取得するフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/notes/[slug]/[id]/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   └─ @/lib/supabase/client
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function useLastPageVisit(pageId: string) {
	const supabase = createClient();

	return useQuery<Date | null, Error>({
		queryKey: ["page-visits", pageId],
		queryFn: async (): Promise<Date | null> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				return null;
			}

			const { data, error } = await supabase
				.from("user_page_visits")
				.select("last_visited_at")
				.eq("user_id", user.id)
				.eq("page_id", pageId)
				.single();

			if (error || !data || !data.last_visited_at) {
				return null;
			}

			return new Date(data.last_visited_at);
		},
		enabled: !!pageId,
	});
}
