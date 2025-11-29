"use client";

/**
 * useCard フック
 *
 * カード詳細を取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/cards/[cardId]/*.tsx
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
 * カード詳細を取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 *
 * @param id カードID
 */
export function useCard(id: string) {
	return useQuery({
		queryKey: ["cards", id],
		queryFn: async (): Promise<Card> => {
			// Repositoryを使ってローカルDBから取得
			const card = await cardsRepository.getById(id);
			if (!card) throw new Error("Card not found");
			return card;
		},
		enabled: !!id,
	});
}
