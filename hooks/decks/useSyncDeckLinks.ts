"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/core";
import { syncCardLinks } from "@/app/_actions/syncCardLinks";
import { createClient } from "@/lib/supabase/client";

/**
 * デッキ内のすべてのカードのリンクを同期します。
 * 各カードのfront_contentからpageLinkマークを収集し、syncCardLinksを呼び出します。
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
				await syncCardLinks(card.id, content);
			}
		},
		onSuccess: (_, deckId) => {
			queryClient.invalidateQueries({ queryKey: ["deck", deckId] });
			queryClient.invalidateQueries({ queryKey: ["decks"] });
		},
	});
}
