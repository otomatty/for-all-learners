"use client";

/**
 * useCreateNote フック
 *
 * 新しいノートを作成します。
 * Repositoryパターンを使用してローカルDBに保存し、バックグラウンドで同期を行います。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/notes/_components/CreateNoteDialog.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ lib/repositories/notes-repository.ts
 *   ├─ lib/supabase/client.ts
 *   └─ @tanstack/react-query
 *
 * Related Documentation:
 *   ├─ Spec: hooks/notes/notes.spec.md
 *   └─ Issue: https://github.com/otomatty/for-all-learners/issues/198
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateNotePayload as RepoCreateNotePayload } from "@/lib/db/types";
import { notesRepository, RepositoryError } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

/**
 * ノート作成用のペイロード型
 */
export type CreateNotePayload = {
	slug: string;
	title: string;
	description?: string;
	visibility: "public" | "unlisted" | "invite" | "private";
};

/**
 * ノートを作成します。
 *
 * - ローカルDBに保存（オフライン対応）
 * - バックグラウンドでサーバーと同期
 */
export function useCreateNote() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateNotePayload) => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			try {
				// Repositoryのペイロード型に変換
				const repoPayload: RepoCreateNotePayload = {
					slug: payload.slug,
					title: payload.title,
					description: payload.description ?? null,
					visibility: payload.visibility,
				};

				// Repositoryを使ってローカルDBに保存
				const createdNote = await notesRepository.create(user.id, repoPayload);

				return createdNote;
			} catch (error) {
				if (error instanceof RepositoryError) {
					throw new Error(`Repository error: ${error.code} - ${error.message}`);
				}
				throw error;
			}
		},
		onSuccess: () => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["notes"] });
		},
	});
}
