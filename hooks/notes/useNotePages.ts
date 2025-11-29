"use client";

/**
 * useNotePages フック
 *
 * ノートに紐づくページをページネーション付きで取得します。
 * ノートの取得にはRepositoryパターンを使用し、ページ一覧はRPCで取得します。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/notes/[slug]/page.tsx
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

import { useQuery } from "@tanstack/react-query";
import { notesRepository } from "@/lib/repositories";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export interface UseNotePagesParams {
	slug: string;
	limit: number;
	offset: number;
	sortBy: "updated" | "created";
}

/**
 * ノートに紐づくページをページネーション付きで取得します。
 *
 * - ノートの取得: ローカルDBから取得（オフライン対応）
 * - ページ一覧: サーバーのRPCで取得（将来的にローカル対応予定）
 */
export function useNotePages(params: UseNotePagesParams) {
	const supabase = createClient();

	return useQuery({
		queryKey: [
			"note-pages",
			params.slug,
			params.limit,
			params.offset,
			params.sortBy,
		],
		queryFn: async (): Promise<{
			pages: Database["public"]["Tables"]["pages"]["Row"][];
			totalCount: number;
		}> => {
			// 認証ユーザーを取得
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("User not authenticated");

			let noteId: string;

			// Handle special "default" slug
			if (params.slug === "default") {
				// ローカルDBからデフォルトノートを取得
				const defaultNote = await notesRepository.getDefaultNote(user.id);
				if (!defaultNote) throw new Error("Default note not found");
				noteId = defaultNote.id;
			} else {
				// ローカルDBからスラッグでノートを取得
				const note = await notesRepository.getBySlug(user.id, params.slug);
				if (!note) throw new Error("Note not found");
				noteId = note.id;
			}

			// Fetch pages via RPC (サーバーから)
			// TODO: Phase E でローカルDBに移行予定
			const { data: rpcData, error: rpcError } = await supabase.rpc(
				"get_note_pages",
				{
					p_note_id: noteId,
					p_limit: params.limit,
					p_offset: params.offset,
					p_sort: params.sortBy,
				},
			);
			if (rpcError) throw rpcError;
			const pages = (rpcData?.[0]?.pages ??
				[]) as Database["public"]["Tables"]["pages"]["Row"][];
			const totalCount = rpcData?.[0]?.total_count ?? 0;
			return { pages, totalCount };
		},
		enabled: !!params.slug,
	});
}
