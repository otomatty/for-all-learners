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
 *   └─ app/(protected)/notes/[slug]/_components/NoteHeader.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/notes-repository.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/notes/notes.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/204
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesRepository } from "@/lib/repositories";

/**
 * ノートを削除します。
 * デフォルトノート（is_default_note = true）は削除できません（Repository側で制御）。
 *
 * - ローカルDBから論理削除（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useDeleteNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			// Repositoryを使ってローカルDBから削除
			// デフォルトノートチェックはRepository側で実施
			await notesRepository.delete(id);
			return id;
		},
		onSuccess: () => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["notes"] });
		},
	});
}
