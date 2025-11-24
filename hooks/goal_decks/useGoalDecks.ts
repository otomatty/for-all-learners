"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Deck = Database["public"]["Tables"]["decks"]["Row"] & {
	card_count?: number;
};

/**
 * 目標に紐づくデッキを取得
 */
export function useGoalDecks(goalId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["goal_decks", goalId],
		queryFn: async (): Promise<Deck[]> => {
			const { data, error } = await supabase
				.from("goal_deck_links")
				.select("decks(*), card_count:cards(count)")
				.eq("goal_id", goalId);

			if (error) throw error;

			// Transform the data structure
			return (data || []).map((link: any) => ({
				...link.decks,
				card_count: link.card_count?.[0]?.count || 0,
			})) as Deck[];
		},
	});
}

