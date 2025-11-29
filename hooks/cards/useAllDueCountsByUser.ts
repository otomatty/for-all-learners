"use client";

/**
 * useAllDueCountsByUser フック
 *
 * ユーザーの全デッキごとに、FSRS次回復習日時が現在日時以前のカード数を一括取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/page.tsx
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
import { cardsRepository } from "@/lib/repositories";

/**
 * ユーザーの全デッキごとに、FSRS次回復習日時が現在日時以前のカード数を一括取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 *
 * @param userId ユーザーID
 * @returns デッキIDをキーとした期限切れカード数マップ
 */
export function useAllDueCountsByUser(userId: string) {
	return useQuery({
		queryKey: ["cards", "due", "counts", "user", userId],
		queryFn: async (): Promise<Record<string, number>> => {
			// Repositoryを使ってローカルDBから取得
			const dueCounts = await cardsRepository.getDueCountsByUser(userId);
			return dueCounts;
		},
		enabled: !!userId,
	});
}
