"use client";

/**
 * useUpdateCard フック
 *
 * カードを更新します。
 * Repositoryパターンを使用してローカルDBを更新し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/cards/[cardId]/edit/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/cards-repository.ts
 *   ├─ lib/supabase/client.ts
 *   ├─ hooks/cards/utils.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/cards/cards.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/206
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	LocalCard,
	UpdateCardPayload as RepoUpdateCardPayload,
} from "@/lib/db/types";
import { cardsRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";
import { triggerQuestionGeneration } from "./utils";

/**
 * カードの型（後方互換性のため）
 */
export type Card = LocalCard;

/**
 * カード更新用のペイロード型
 */
export type UpdateCardPayload = {
	id: string;
	updates: RepoUpdateCardPayload;
};

/**
 * カードを更新します。
 *
 * - ローカルDBを更新（オフライン対応）
 * - バックグラウンドでサーバーと同期
 * - 有料ユーザーの場合、バックグラウンドで問題プリジェネレーションを実行
 */
export function useUpdateCard() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, updates }: UpdateCardPayload): Promise<Card> => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// Repositoryを使ってローカルDBを更新
			const updatedCard = await cardsRepository.update(id, updates);

			// バックグラウンドで問題プリジェネをキック（有料ユーザーのみ）
			await triggerQuestionGeneration(supabase, updatedCard);

			return updatedCard;
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
