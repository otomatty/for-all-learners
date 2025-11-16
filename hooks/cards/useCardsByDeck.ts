"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Card = Database["public"]["Tables"]["cards"]["Row"];

/**
 * デッキ内のカード一覧を取得します。
 * @param deckId デッキID
 */
export function useCardsByDeck(deckId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["cards", "deck", deckId],
		queryFn: async (): Promise<Card[]> => {
			const { data, error } = await supabase
				.from("cards")
				.select("*")
				.eq("deck_id", deckId);

			if (error) throw error;
			return data ?? [];
		},
		enabled: !!deckId,
	});
}
