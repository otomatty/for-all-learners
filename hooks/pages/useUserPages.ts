"use client";

/**
 * useUserPages フック
 *
 * ユーザーのページ一覧（IDとタイトルのみ）を取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/decks/[deckId]/_components/CardList/CardsList.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/pages-repository.ts
 *   ├─ lib/supabase/client.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/pages/pages.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/204
 */

import { useQuery } from "@tanstack/react-query";
import type { LocalPage } from "@/lib/db/types";
import { pagesRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

export type UserPageSummary = {
	id: string;
	title: string;
};

/**
 * LocalPage から UserPageSummary へのマッピング
 */
function toUserPageSummary(page: LocalPage): UserPageSummary {
	return {
		id: page.id,
		title: page.title,
	};
}

/**
 * ユーザーのページ一覧（IDとタイトルのみ）を取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useUserPages(userId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", "user", userId],
		queryFn: async (): Promise<UserPageSummary[]> => {
			// 認証ユーザーを確認
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// ローカルDBからユーザーのページを取得
			const pages = await pagesRepository.getAll(userId);
			return pages.map(toUserPageSummary);
		},
		enabled: !!userId,
	});
}
