"use client";

/**
 * useDueCardsByDeck フック
 *
 * 次回復習日時が現在日時以前のカードを取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/study/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/cards-repository.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/cards/cards.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/206
 */

import { useQuery } from "@tanstack/react-query";
import type { LocalCard } from "@/lib/db/types";
import { cardsRepository } from "@/lib/repositories";

/**
 * カードの型（後方互換性のため）
 */
export type Card = LocalCard;

/**
 * 次回復習日時が現在日時以前のカードを取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 *
 * @param deckId デッキID
 * @param userId ユーザーID
 */
export function useDueCardsByDeck(deckId: string, userId: string) {
	return useQuery({
		queryKey: ["cards", "due", "deck", deckId, "user", userId],
		queryFn: async (): Promise<Card[]> => {
			// Repositoryを使ってローカルDBから取得
			const dueCards = await cardsRepository.getDueCardsByDeck(deckId, userId);
			return dueCards;
		},
		enabled: !!deckId && !!userId,
	});
}
