"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type DeckInsert = Omit<
	Database["public"]["Tables"]["decks"]["Insert"],
	"id"
>;

export type Deck = Database["public"]["Tables"]["decks"]["Row"];

/**
 * デッキを作成します。
 */
export function useCreateDeck() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: DeckInsert): Promise<Deck> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("decks")
				.insert([payload])
				.select()
				.single();

			if (error) {
				throw new Error(`デッキの作成に失敗しました: ${error.message}`);
			}
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["decks"] });
		},
	});
}
