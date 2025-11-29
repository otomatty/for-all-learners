"use client";

/**
 * useDeletePage フック
 *
 * ページを削除します。
 * Repositoryパターンを使用してローカルDBから削除し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/pages/[id]/_components/PageSettings.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/pages-repository.ts
 *   ├─ lib/services/linkGroupService.ts
 *   ├─ lib/supabase/client.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/pages/pages.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/204
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pagesRepository } from "@/lib/repositories";
import { deleteLinkOccurrencesByPage } from "@/lib/services/linkGroupService";
import { createClient } from "@/lib/supabase/client";

/**
 * ページを削除します。
 * 削除前にリンクグループの関連データも削除します。
 *
 * - ローカルDBから論理削除（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useDeletePage() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// Delete link group occurrences for this page (サーバーから)
			// TODO: これもローカルDBに移行する必要がある
			await deleteLinkOccurrencesByPage(supabase, id);

			// Repositoryを使ってローカルDBから削除（論理削除）
			const deleted = await pagesRepository.delete(id);

			if (!deleted) {
				throw new Error("ページの削除に失敗しました。");
			}

			return deleted;
		},
		onSuccess: () => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["pages"] });
		},
	});
}
