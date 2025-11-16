"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Card = Database["public"]["Tables"]["cards"]["Row"];

/**
 * 次回復習日時が現在日時以前のカードを取得します。
 * @param deckId デッキID
 * @param userId ユーザーID
 */
export function useDueCardsByDeck(deckId: string, userId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["cards", "due", "deck", deckId, "user", userId],
		queryFn: async (): Promise<Card[]> => {
			const now = new Date().toISOString();
			const { data, error } = await supabase
				.from("cards")
				.select("*")
				.eq("deck_id", deckId)
				.eq("user_id", userId)
				.lte("next_review_at", now);

			if (error) throw error;
			return data ?? [];
		},
		enabled: !!deckId && !!userId,
	});
}
