"use client";

/**
 * useCreateDefaultNote フック
 *
 * ユーザーのデフォルトノートを作成します。
 * Repositoryパターンを使用してローカルDBに保存し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/notes/layout.tsx
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
 * ユーザーのデフォルトノートを作成します。
 *
 * - ローカルDBに保存（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useCreateDefaultNote() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			// Repositoryを使ってデフォルトノートを作成
			return await notesRepository.createDefaultNote(userId);
		},
		onSuccess: () => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["notes"] });
			queryClient.invalidateQueries({ queryKey: ["default-note"] });
		},
	});
}
