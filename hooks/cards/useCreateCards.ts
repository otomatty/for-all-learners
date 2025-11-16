"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Card = Database["public"]["Tables"]["cards"]["Row"];
export type CreateCardsPayload = Array<
	Omit<Database["public"]["Tables"]["cards"]["Insert"], "id">
>;

/**
 * カードを一括作成します。
 */
export function useCreateCards() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (cards: CreateCardsPayload): Promise<Card[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("cards")
				.insert(cards)
				.select();

			if (error) throw error;
			if (!data) throw new Error("createCards: no data returned");
			return data;
		},
		onSuccess: (data) => {
			// 関連するクエリを無効化
			if (data.length > 0) {
				const deckIds = [...new Set(data.map((card) => card.deck_id))];
				deckIds.forEach((deckId) => {
					queryClient.invalidateQueries({
						queryKey: ["cards", "deck", deckId],
					});
				});
			}
			queryClient.invalidateQueries({ queryKey: ["cards"] });
		},
	});
}
