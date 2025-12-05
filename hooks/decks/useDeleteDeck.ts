"use client";

/**
 * useDeleteDeck フック
 *
 * デッキを削除します。
 * Repositoryパターンを使用してローカルDBで論理削除し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/settings/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/decks-repository.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/decks/decks.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/206
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LocalDeck } from "@/lib/db/types";
import { decksRepository } from "@/lib/repositories";

/**
 * デッキの型（後方互換性のため）
 */
export type Deck = LocalDeck;

/**
 * デッキを削除します。
 *
 * - ローカルDBで論理削除（オフライン対応）
 * - バックグラウンドでサーバーと同期
 * - 関連データ（cards等）は同期時にサーバー側で削除
 */
export function useDeleteDeck() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<Deck> => {
			// まずデッキを取得
			const deck = await decksRepository.getById(id);
			if (!deck) {
				throw new Error("デッキが見つかりません");
			}

			// Repositoryを使って論理削除
			await decksRepository.delete(id);

			return deck;
		},
		onSuccess: () => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["decks"] });
		},
	});
}
