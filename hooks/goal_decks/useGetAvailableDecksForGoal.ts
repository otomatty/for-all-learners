"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Deck = Database["public"]["Tables"]["decks"]["Row"] & {
	card_count?: number;
};

/**
 * 目標に追加可能なデッキを取得
 */
export function useGetAvailableDecksForGoal(goalId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["available_decks_for_goal", goalId],
		queryFn: async (): Promise<Deck[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// Get decks already linked to this goal
			const { data: linkedDecks, error: linkedError } = await supabase
				.from("goal_deck_links")
				.select("deck_id")
				.eq("goal_id", goalId);

			if (linkedError) throw linkedError;

			const linkedDeckIds = (linkedDecks || []).map((link) => link.deck_id);

			// Get all user's decks that are not linked
			const decksQuery = supabase
				.from("decks")
				.select("*, card_count:cards(count)")
				.eq("user_id", user.id);

			const { data: decks, error: decksError } =
				linkedDeckIds.length > 0
					? await decksQuery.not("id", "in", `(${linkedDeckIds.join(",")})`)
					: await decksQuery;

			if (decksError) throw decksError;

			return (decks || []).map((deck: any) => ({
				...deck,
				card_count: deck.card_count?.[0]?.count || 0,
			})) as Deck[];
		},
	});
}
