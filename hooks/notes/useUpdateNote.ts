"use client";

/**
 * useUpdateNote フック
 *
 * ノートを更新します。
 * Repositoryパターンを使用してローカルDBに保存し、バックグラウンドで同期を行います。
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
import type { UpdateNotePayload as RepoUpdatePayload } from "@/lib/db/types";
import { notesRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";

/**
 * ノート更新用のペイロード型
 */
export type UpdateNotePayload = {
	title?: string;
	description?: string | null;
	visibility?: "public" | "unlisted" | "invite" | "private";
};

/**
 * ノートを更新します。
 *
 * - ローカルDBに保存（オフライン対応）
 * - バックグラウンドでサーバーと同期
 * - 公開設定変更時は共有情報もクリア（サーバー同期時に実行）
 */
export function useUpdateNote() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			payload,
		}: {
			id: string;
			payload: UpdateNotePayload;
		}) => {
			// 認証ユーザーを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// Repositoryのペイロード型に変換
			const repoPayload: RepoUpdatePayload = {
				title: payload.title,
				description: payload.description,
				visibility: payload.visibility,
			};

			// Repositoryを使ってローカルDBを更新
			return await notesRepository.update(id, repoPayload);
		},
		onSuccess: (_, variables) => {
			// キャッシュを無効化して再フェッチ
			queryClient.invalidateQueries({ queryKey: ["notes"] });
			queryClient.invalidateQueries({ queryKey: ["note", variables.id] });
		},
	});
}
