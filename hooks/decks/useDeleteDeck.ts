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

			// 関連データを正しい順序で削除

			// 1. カードの削除
			const { error: cardsError } = await supabase
				.from("cards")
				.delete()
				.eq("deck_id", id);

			if (cardsError) {
				throw new Error(`カードの削除に失敗しました: ${cardsError.message}`);
			}

			// 2. 目標デッキリンクの削除
			const { error: goalLinksError } = await supabase
				.from("goal_deck_links")
				.delete()
				.eq("deck_id", id);

			if (goalLinksError) {
				throw new Error(
					`目標リンクの削除に失敗しました: ${goalLinksError.message}`,
				);
			}

			// 3. ノートデッキリンクの削除
			const { error: noteLinksError } = await supabase
				.from("note_deck_links")
				.delete()
				.eq("deck_id", id);

			if (noteLinksError) {
				throw new Error(
					`ノートリンクの削除に失敗しました: ${noteLinksError.message}`,
				);
			}

			// 4. 共有情報の削除
			const { error: sharesError } = await supabase
				.from("deck_shares")
				.delete()
				.eq("deck_id", id);

			if (sharesError) {
				throw new Error(`共有情報の削除に失敗しました: ${sharesError.message}`);
			}

			// 5. 学習ログの削除
			const { error: studyLogsError } = await supabase
				.from("deck_study_logs")
				.delete()
				.eq("deck_id", id);

			if (studyLogsError) {
				throw new Error(
					`学習ログの削除に失敗しました: ${studyLogsError.message}`,
				);
			}

			// 6. 音声記録の削除
			const { error: audioError } = await supabase
				.from("audio_transcriptions")
				.delete()
				.eq("deck_id", id);

			if (audioError) {
				throw new Error(`音声記録の削除に失敗しました: ${audioError.message}`);
			}

			// 7. 最後にデッキ本体を削除
			const { data, error: deckError } = await supabase
				.from("decks")
				.delete()
				.eq("id", id)
				.single();

			if (deckError) {
				throw new Error(`デッキの削除に失敗しました: ${deckError.message}`);
			}

			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["decks"] });
		},
	});
}
