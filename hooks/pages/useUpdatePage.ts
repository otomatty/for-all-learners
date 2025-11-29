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
 *   └─ app/(protected)/pages/[id]/_components/PageSettings.tsx
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
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			updates,
		}: {
			id: string;
			updates: UpdatePagePayload;
		}) => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

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
