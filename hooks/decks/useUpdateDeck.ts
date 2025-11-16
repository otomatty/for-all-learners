"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type DeckUpdate = Database["public"]["Tables"]["decks"]["Update"];

export type Deck = Database["public"]["Tables"]["decks"]["Row"];

/**
 * デッキを更新します。
 */
export function useUpdateDeck() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: DeckUpdate;
		}): Promise<Deck> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("decks")
				.update(updates)
				.eq("id", id)
				.single();

			if (error) throw error;
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["decks"] });
			queryClient.invalidateQueries({ queryKey: ["deck", variables.id] });
		},
	});
}
