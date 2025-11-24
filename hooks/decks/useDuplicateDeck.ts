"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Deck = Database["public"]["Tables"]["decks"]["Row"];

/**
 * デッキを複製します。
 */
export function useDuplicateDeck() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (deckId: string): Promise<Deck> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// Get original deck
			const { data: originalDeck, error: fetchError } = await supabase
				.from("decks")
				.select("*")
				.eq("id", deckId)
				.single();

			if (fetchError || !originalDeck) {
				throw new Error("デッキが見つかりません");
			}

			// Create new deck
			const { data: newDeck, error: createError } = await supabase
				.from("decks")
				.insert({
					title: `${originalDeck.title} (コピー)`,
					description: originalDeck.description,
					is_public: false,
					user_id: user.id,
				})
				.select()
				.single();

			if (createError || !newDeck) {
				throw new Error(`デッキの複製に失敗しました: ${createError?.message}`);
			}

			// Copy cards
			const { data: cards, error: cardsError } = await supabase
				.from("cards")
				.select("*")
				.eq("deck_id", deckId);

			if (cardsError) {
				// If cards fetch fails, still return the new deck
				return newDeck;
			}

			if (cards && cards.length > 0) {
				const newCards = cards.map((card) => ({
					deck_id: newDeck.id,
					user_id: user.id,
					front_content: card.front_content,
					back_content: card.back_content,
					difficulty: card.difficulty,
					last_reviewed_at: card.last_reviewed_at,
					next_review_at: card.next_review_at,
					review_count: card.review_count,
					ease_factor: card.ease_factor,
					interval_days: card.interval_days,
				}));

				const { error: insertCardsError } = await supabase
					.from("cards")
					.insert(newCards);

				if (insertCardsError) {
					// If cards insert fails, still return the new deck
					console.error("Failed to copy cards:", insertCardsError);
				}
			}

			return newDeck;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["decks"] });
		},
	});
}
