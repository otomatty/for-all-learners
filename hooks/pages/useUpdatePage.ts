"use client";

/**
 * useUpdatePage フック
 *
 * ページを更新します。
 * - メタデータ: Repositoryパターンを使用してローカルDBに保存
 * - content_tiptap: サーバーに直接保存（リアルタイム同期用）
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ components/pages/_hooks/usePageSaver.ts
 *   └─ components/pages/_hooks/useSmartThumbnailSync.ts
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

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdatePagePayload } from "@/lib/db/types";
import { pagesRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database.types";

/**
 * ページを更新します。
 *
 * - メタデータ（title, note_id, is_public, thumbnail_url）: ローカルDBに保存
 * - content_tiptap: サーバーに直接保存（リアルタイム同期用のため）
 */
export function useUpdatePage() {
	const queryClient = useQueryClient();
	const supabase = createClient();

	return useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: UpdatePagePayload;
		}) => {
			const { content_tiptap, ...metadataUpdates } = updates;

			// content_tiptap がある場合はサーバーに直接保存
			if (content_tiptap !== undefined) {
				const { error } = await supabase
					.from("pages")
					.update({ content_tiptap: content_tiptap as Json })
					.eq("id", id);

				if (error) {
					throw new Error(`Failed to update content: ${error.message}`);
				}
			}

			// メタデータがある場合はローカルDBを更新
			const hasMetadataUpdates = Object.keys(metadataUpdates).length > 0;
			if (hasMetadataUpdates) {
				return await pagesRepository.updateMetadata(id, metadataUpdates);
			}

			// content_tiptap のみの更新の場合は、ローカルDBから現在のページを返す
			const page = await pagesRepository.getById(id);
			if (!page) {
				throw new Error("Page not found");
			}
			return page;
		},
		onSuccess: (data) => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["pages"] });
			queryClient.invalidateQueries({ queryKey: ["pages", data.id] });
		},
	});
}
