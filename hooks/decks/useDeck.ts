"use client";

/**
 * useDeck フック
 *
 * 指定されたIDのデッキを取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/*.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/decks-repository.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/decks/decks.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/206
 */

import { useQuery } from "@tanstack/react-query";
import type { LocalDeck } from "@/lib/db/types";
import { decksRepository } from "@/lib/repositories";

/**
 * デッキの型（後方互換性のため）
 */
export type Deck = LocalDeck;

/**
 * 指定されたIDのデッキを取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 *
 * @param id デッキID
 */
export function useDeck(id: string) {
	return useQuery({
		queryKey: ["deck", id],
		queryFn: async (): Promise<Deck> => {
			// Repositoryを使ってローカルDBから取得
			const deck = await decksRepository.getById(id);
			if (!deck) throw new Error("Deck not found");
			return deck;
		},
		enabled: !!id,
	});
}
