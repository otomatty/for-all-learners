"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/client";
import { extractLinkData } from "@/lib/utils/linkUtils";

/**
 * デッキ内のすべてのカードのリンクを同期します。
 * 各カードのfront_contentからpageLinkマークを収集し、card_page_linksテーブルを更新します。
 */
export function useSyncDeckLinks() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (deckId: string): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// デッキ内のすべてのカードを取得
			const { data: cards, error: fetchErr } = await supabase
				.from("cards")
				.select("id, front_content")
				.eq("deck_id", deckId);

			if (fetchErr) throw fetchErr;

			// 各カードのリンクを同期
			for (const card of cards ?? []) {
				const content = card.front_content as JSONContent;
				const { outgoingIds } = extractLinkData(content);

				// Delete existing links for this card
				const { error: deleteError } = await supabase
					.from("card_page_links")
					.delete()
					.eq("card_id", card.id);

				if (deleteError) {
					throw deleteError;
				}

				// Insert new links
				if (outgoingIds.length > 0) {
					const linksToInsert = outgoingIds.map((linkedId) => ({
						card_id: card.id,
						page_id: linkedId,
					}));

					const { error: insertError } = await supabase
						.from("card_page_links")
						.insert(linksToInsert);

					if (insertError) {
						throw insertError;
					}
				}
			}
		},
		onSuccess: (_, deckId) => {
			queryClient.invalidateQueries({ queryKey: ["deck", deckId] });
			queryClient.invalidateQueries({ queryKey: ["decks"] });
		},
	});
}
