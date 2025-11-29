"use client";

/**
 * useUpdatePage フック
 *
 * ページを更新します。
 * Repositoryパターンを使用してローカルDBに保存し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ components/pages/_hooks/usePageSaver.ts
 *   └─ components/pages/_hooks/useSmartThumbnailSync.ts
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/pages-repository.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/pages/pages.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/204
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdatePagePayload } from "@/lib/db/types";
import { pagesRepository } from "@/lib/repositories";

/**
 * ページを更新します。
 *
 * - ローカルDBに保存（オフライン対応）
 * - バックグラウンドでサーバーと同期
 *
 * 注意: content_tiptap はリアルタイム同期（Yjs）で管理されるため、
 * このフックではメタデータのみを更新します。
 */
export function useUpdatePage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: UpdatePagePayload;
		}) => {
			// Repositoryを使ってローカルDBを更新
			return await pagesRepository.updateMetadata(id, updates);
		},
		onSuccess: (data) => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["pages"] });
			queryClient.invalidateQueries({ queryKey: ["pages", data.id] });
		},
	});
}
