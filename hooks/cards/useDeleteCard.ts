"use client";

/**
 * useDeleteCard フック
 *
 * カードを削除します。
 * Repositoryパターンを使用してローカルDBで論理削除し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/cards/[cardId]/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/cards-repository.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/cards/cards.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/206
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LocalCard } from "@/lib/db/types";
import { cardsRepository } from "@/lib/repositories";

/**
 * カードの型（後方互換性のため）
 */
export type Card = LocalCard;

/**
 * カードを削除します。
 *
 * - ローカルDBで論理削除（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useDeleteCard() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<Card> => {
			// まずカードを取得して情報を保持
			const card = await cardsRepository.getById(id);
			if (!card) throw new Error("Card not found");

			// Repositoryを使って論理削除
			await cardsRepository.delete(id);

			return card;
		},
		onSuccess: (data) => {
			// 関連するクエリを無効化
			queryClient.invalidateQueries({ queryKey: ["cards", data.id] });
			queryClient.invalidateQueries({
				queryKey: ["cards", "deck", data.deck_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["cards", "user", data.user_id],
			});
			queryClient.invalidateQueries({ queryKey: ["cards", "due"] });
		},
	});
}
