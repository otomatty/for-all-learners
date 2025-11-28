"use client";

/**
 * useUpdateDeck フック
 *
 * デッキを更新します。
 * Repositoryパターンを使用してローカルDBを更新し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/settings/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/decks-repository.ts
 *   ├─ lib/supabase/client.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/decks/decks.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/198
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { LocalDeck } from "@/lib/db/types";
import { decksRepository, RepositoryError } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

/**
 * デッキ更新用のペイロード型
 */
export type DeckUpdate = {
	title?: string;
	description?: string | null;
	is_public?: boolean;
};

/**
 * デッキの型（後方互換性のため）
 */
export type Deck = LocalDeck;

/**
 * デッキを更新します。
 *
 * - ローカルDBを更新（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useUpdateDeck() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: DeckUpdate;
		}): Promise<Deck> => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			try {
				// Repositoryを使ってローカルDBを更新
				const updatedDeck = await decksRepository.update(id, {
					title: updates.title,
					description: updates.description,
					is_public: updates.is_public,
					updated_at: new Date().toISOString(),
				});

				return updatedDeck;
			} catch (error) {
				if (error instanceof RepositoryError) {
					throw new Error(`Repository error: ${error.code} - ${error.message}`);
				}
				throw error;
			}
		},
		onSuccess: (_, variables) => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["decks"] });
			queryClient.invalidateQueries({ queryKey: ["deck", variables.id] });
		},
	});
}
