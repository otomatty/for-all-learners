"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Deck = Database["public"]["Tables"]["decks"]["Row"];

/**
 * デッキを削除します。
 * 関連データ（cards, goal_deck_links, note_deck_links, deck_shares, deck_study_logs, audio_transcriptions）も削除されます。
 */
export function useDeleteDeck() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<Deck> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// デッキの所有者であることを確認
			const { data: deck, error: deckFetchError } = await supabase
				.from("decks")
				.select("user_id")
				.eq("id", id)
				.single();

			if (deckFetchError || !deck) {
				throw new Error("デッキが見つかりません");
			}

			if (deck.user_id !== user.id) {
				throw new Error("このデッキを削除する権限がありません");
			}

			// RPC関数を使用してトランザクション内で削除
			const { data, error } = await supabase.rpc(
				"delete_deck_with_transaction",
				{
					p_deck_id: id,
				},
			);

			if (error) {
				throw new Error(`デッキの削除に失敗しました: ${error.message}`);
			}

			if (!data) {
				throw new Error("デッキの削除に失敗しました");
			}

			// RPC関数は単一のdecks行を返す
			return data as Deck;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["decks"] });
		},
	});
}
