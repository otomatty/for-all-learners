"use client";

/**
 * usePagesByNote フック
 *
 * ノート内のページ一覧を取得します。
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
 * ノート内のページ一覧を取得します。
 *
 * - ローカルDBから取得（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function usePagesByNote(noteId: string) {
	return useQuery({
		queryKey: ["pages", "by-note", noteId],
		queryFn: async () => {
			// ローカルDBからノートに紐づくページを取得
			return await pagesRepository.getByNoteId(noteId);
		},
		enabled: !!noteId,
	});
}
