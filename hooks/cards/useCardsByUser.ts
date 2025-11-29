"use client";

/**
 * useCardsByUser フック
 *
 * ユーザーのカード一覧を取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/dashboard/page.tsx
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
 * カードのサマリー情報（UI表示用）
 *
 * 既存のインターフェースとの後方互換性を確保
 */
export type CardSummary = Pick<LocalCard, "id">;

/**
 * ユーザーのカード一覧（IDのみ）を取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 *
 * @param userId ユーザーID
 */
export function useCardsByUser(userId: string) {
	return useQuery({
		queryKey: ["cards", "user", userId],
		queryFn: async (): Promise<CardSummary[]> => {
			// Repositoryを使ってローカルDBから取得
			const cards = await cardsRepository.getAll(userId);

			// IDのみを返す（後方互換性のため）
			return cards.map((card) => ({ id: card.id }));
		},
		enabled: !!userId,
	});
}
