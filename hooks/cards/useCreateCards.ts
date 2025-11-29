"use client";

/**
 * useCreateCards フック
 *
 * カードを一括作成します。
 * Repositoryパターンを使用してローカルDBに保存し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/cards/import/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/cards-repository.ts
 *   ├─ lib/supabase/client.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/cards/cards.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/206
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateCardPayload, LocalCard } from "@/lib/db/types";
import { cardsRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

/**
 * カードの型（後方互換性のため）
 */
export type Card = LocalCard;

/**
 * カード一括作成用のペイロード型
 */
export type CreateCardsPayload = CreateCardPayload[];

/**
 * カードを一括作成します。
 *
 * - ローカルDBに一括保存（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useCreateCards() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (cards: CreateCardsPayload): Promise<Card[]> => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// Repositoryを使ってローカルDBに一括保存
			const createdCards = await cardsRepository.createBatch(user.id, cards);
			return createdCards;
		},
		onSuccess: (data) => {
			// 関連するクエリを無効化
			if (data.length > 0) {
				const deckIds = [...new Set(data.map((card) => card.deck_id))];
				const userIds = [...new Set(data.map((card) => card.user_id))];
				for (const deckId of deckIds) {
					queryClient.invalidateQueries({
						queryKey: ["cards", "deck", deckId],
					});
				}
				for (const userId of userIds) {
					queryClient.invalidateQueries({
						queryKey: ["cards", "user", userId],
					});
				}
				queryClient.invalidateQueries({ queryKey: ["cards", "due"] });
			}
		},
	});
}
