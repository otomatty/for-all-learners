"use client";

/**
 * useCreateDeck フック
 *
 * 新しいデッキを作成します。
 * Repositoryパターンを使用してローカルDBに保存し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/_components/CreateDeckDialog.tsx
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
import type {
	LocalDeck,
	CreateDeckPayload as RepoCreateDeckPayload,
} from "@/lib/db/types";
import { decksRepository, RepositoryError } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

/**
 * デッキ作成用のペイロード型
 */
export type DeckInsert = {
	user_id: string;
	title: string;
	description?: string | null;
	is_public?: boolean;
};

/**
 * デッキの型（後方互換性のため）
 */
export type Deck = LocalDeck;

/**
 * デッキを作成します。
 *
 * - ローカルDBに保存（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useCreateDeck() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: DeckInsert): Promise<Deck> => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			try {
				// Repositoryのペイロード型に変換
				const repoPayload: RepoCreateDeckPayload = {
					title: payload.title,
					description: payload.description ?? null,
					is_public: payload.is_public ?? false,
				};

				// Repositoryを使ってローカルDBに保存
				const createdDeck = await decksRepository.create(user.id, repoPayload);

				return createdDeck;
			} catch (error) {
				if (error instanceof RepositoryError) {
					throw new Error(`Repository error: ${error.code} - ${error.message}`);
				}
				throw error;
			}
		},
		onSuccess: () => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["decks"] });
		},
	});
}
