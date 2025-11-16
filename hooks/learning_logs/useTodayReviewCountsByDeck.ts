"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type TodayReviewCountByDeck = {
	deck_id: string;
	review_count: number;
};

/**
 * ユーザーが当日レビュー済みのカード数をデッキごとに集計して返します。
 */
export function useTodayReviewCountsByDeck() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["learning_logs", "today_review_counts"],
		queryFn: async (): Promise<TodayReviewCountByDeck[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Not authenticated");

			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			const { data: logs, error } = await supabase
				.from("learning_logs")
				.select("card_id, cards(deck_id)")
				.eq("user_id", user.id)
				.gte("answered_at", today.toISOString())
				.lt("answered_at", tomorrow.toISOString());

			if (error) throw error;

			const map = new Map<string, number>();
			for (const log of logs ?? []) {
				const card = log as { cards: { deck_id: string } };
				if (card.cards?.deck_id) {
					const deckId = card.cards.deck_id;
					map.set(deckId, (map.get(deckId) ?? 0) + 1);
				}
			}

			return Array.from(map.entries()).map(([deck_id, review_count]) => ({
				deck_id,
				review_count,
			}));
		},
	});
}
