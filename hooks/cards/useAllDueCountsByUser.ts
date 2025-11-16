"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ユーザーの全デッキごとに、FSRS次回復習日時が現在日時以前のカード数を一括取得します。
 * @param userId ユーザーID
 * @returns デッキIDをキーとした期限切れカード数マップ
 */
export function useAllDueCountsByUser(userId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["cards", "due", "counts", "user", userId],
		queryFn: async (): Promise<Record<string, number>> => {
			const now = new Date().toISOString();
			const { data, error } = await supabase
				.from("cards")
				.select("deck_id")
				.eq("user_id", userId)
				.lte("next_review_at", now);

			if (error) throw error;

			const map: Record<string, number> = {};
			for (const row of data ?? []) {
				map[row.deck_id] = (map[row.deck_id] ?? 0) + 1;
			}
			return map;
		},
		enabled: !!userId,
	});
}
