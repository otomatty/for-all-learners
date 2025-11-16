"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type DeckShareWithDeck =
	Database["public"]["Tables"]["deck_shares"]["Row"] & {
		decks: Database["public"]["Tables"]["decks"]["Row"];
	};

/**
 * ユーザーに共有されたデッキの一覧を取得します。
 */
export function useSharedDecks() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["shared-decks"],
		queryFn: async (): Promise<DeckShareWithDeck[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("deck_shares")
				.select("*, decks(*)")
				.eq("shared_with_user_id", user.id)
				.order("decks(updated_at)", { ascending: false });

			if (error) throw error;
			return data ?? [];
		},
	});
}
