"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Deck = Database["public"]["Tables"]["decks"]["Row"];

/**
 * ユーザーが所有するデッキの一覧を取得します。
 */
export function useDecks() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["decks"],
		queryFn: async (): Promise<Deck[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("decks")
				.select("*")
				.eq("user_id", user.id);

			if (error) throw error;
			return data ?? [];
		},
	});
}
