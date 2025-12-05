"use client";

/**
 * useDuplicateDeck フック
 *
 * デッキを複製します。
 * Repositoryパターンを使用してローカルDBに保存し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/decks-repository.ts
 *   ├─ lib/repositories/cards-repository.ts
 *   ├─ lib/supabase/client.ts
 *   ├─ lib/logger.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/decks/decks.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/206
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateCardPayload, LocalDeck } from "@/lib/db/types";
import logger from "@/lib/logger";
import { cardsRepository, decksRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

/**
 * デッキの型（後方互換性のため）
 */
export type Deck = LocalDeck;

/**
 * デッキを複製します。
 *
 * - ローカルDBにデッキとカードを複製（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useDuplicateDeck() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (deckId: string): Promise<Deck> => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// 元のデッキを取得
			const originalDeck = await decksRepository.getById(deckId);
			if (!originalDeck) {
				throw new Error("デッキが見つかりません");
			}

			// 新しいデッキを作成
			const newDeck = await decksRepository.create(user.id, {
				title: `${originalDeck.title} (コピー)`,
				description: originalDeck.description,
				is_public: false,
			});

			// 元のデッキのカードを取得
			try {
				const originalCards = await cardsRepository.getByDeckId(deckId);

				if (originalCards.length > 0) {
					// カードを複製用のペイロードに変換
					const newCardPayloads: CreateCardPayload[] = originalCards.map(
						(card) => ({
							deck_id: newDeck.id,
							front_content: card.front_content,
							back_content: card.back_content,
							source_audio_url: card.source_audio_url,
							source_ocr_image_url: card.source_ocr_image_url,
						}),
					);

					// カードを一括作成
					await cardsRepository.createBatch(user.id, newCardPayloads);
				}
			} catch (error) {
				// カードの複製に失敗しても、デッキは返す
				logger.error({ error }, "Failed to copy cards when duplicating deck");
			}

			return newDeck;
		},
		onSuccess: () => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["decks"] });
		},
	});
}
