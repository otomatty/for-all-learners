"use client";

/**
 * useDeleteNote フック
 *
 * ノートを削除します。
 * Repositoryパターンを使用してローカルDBから削除し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/notes/[slug]/_components/NoteSettings.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/notes-repository.ts
 *   ├─ lib/supabase/client.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/notes/notes.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/204
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

/**
 * ノートを削除します。
 * デフォルトノート（is_default_note = true）は削除できません。
 *
 * - ローカルDBから論理削除（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useDeleteNote() {
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

			// ノートを取得してデフォルトノートかチェック
			const note = await notesRepository.getById(id);

			if (!note) {
				throw new Error("ノートが見つかりませんでした。");
			}

			if (note.is_default_note) {
				throw new Error("デフォルトノートは削除できません。");
			}

			// Repositoryを使ってローカルDBから削除（論理削除）
			const deleted = await notesRepository.delete(id);

			if (!deleted) {
				throw new Error("ノートの削除に失敗しました。");
			}

			return deleted;
		},
		onSuccess: () => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["notes"] });
		},
	});
}
