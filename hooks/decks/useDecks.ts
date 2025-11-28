"use client";

/**
 * useDecks フック
 *
 * ユーザーが所有するデッキの一覧を取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/page.tsx
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

import { useQuery } from "@tanstack/react-query";
import type { LocalDeck } from "@/lib/db/types";
import { decksRepository, RepositoryError } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

/**
 * デッキのサマリー情報（UI表示用）
 *
 * 既存のインターフェースとの後方互換性を確保
 */
export interface DeckSummary {
	id: string;
	user_id: string;
	title: string;
	description: string | null;
	is_public: boolean;
	created_at: string;
	updated_at: string;
}

/**
 * LocalDeck から DeckSummary へのマッピング
 */
function toDeckSummary(deck: LocalDeck): DeckSummary {
	return {
		id: deck.id,
		user_id: deck.user_id,
		title: deck.title,
		description: deck.description,
		is_public: deck.is_public,
		created_at: deck.created_at,
		updated_at: deck.updated_at,
	};
}

/**
 * ユーザーが所有するデッキの一覧を取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useDecks() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["decks"],
		queryFn: async (): Promise<DeckSummary[]> => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			try {
				// ローカルDBからデッキを取得
				const decks = await decksRepository.getAll(user.id);

				// DeckSummary形式にマッピング
				return decks.map(toDeckSummary);
			} catch (error) {
				// RepositoryErrorの場合はそのまま再スロー
				if (error instanceof RepositoryError) {
					throw new Error(`Repository error: ${error.code} - ${error.message}`);
				}
				throw error;
			}
		},
	});
}

// 後方互換性のための型エクスポート（既存コードで使用されている場合）
export type Deck = DeckSummary;
