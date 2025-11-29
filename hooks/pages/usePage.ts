"use client";

/**
 * usePage フック
 *
 * ページの詳細情報を取得します。
 * Repositoryパターンを使用してローカルDBから取得し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ (Currently unused - exported for future use)
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/pages-repository.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/pages/pages.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/204
 */

import { useQuery } from "@tanstack/react-query";
import { pagesRepository } from "@/lib/repositories";

/**
 * ページ詳細を取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function usePage(id: string) {
	return useQuery({
		queryKey: ["pages", id],
		queryFn: async () => {
			// ローカルDBからページを取得
			const page = await pagesRepository.getById(id);

			if (!page) {
				throw new Error("Page not found");
			}

			return page;
		},
		enabled: !!id,
	});
}
