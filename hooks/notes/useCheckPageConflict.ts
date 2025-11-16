"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CheckPageConflictParams {
	noteId: string;
	pageTitle: string;
	excludePageId?: string;
}

export interface ConflictPage {
	id: string;
	title: string;
	created_at: string | null;
	updated_at: string | null;
	content_tiptap: Record<string, unknown> | null;
}

/**
 * 指定されたノートに同名のページが存在するかチェックします。
 */
export function useCheckPageConflict() {
	const supabase = createClient();

	return useMutation({
		mutationFn: async (
			params: CheckPageConflictParams,
		): Promise<ConflictPage[]> => {
			// ノート内の同タイトルページを検索（内容のプレビューも含む）
			let query = supabase
				.from("pages")
				.select(`
					id, title, created_at, updated_at, content_tiptap,
					note_page_links!inner(note_id)
				`)
				.eq("note_page_links.note_id", params.noteId)
				.eq("title", params.pageTitle);

			// 除外ページがある場合
			if (params.excludePageId) {
				query = query.neq("id", params.excludePageId);
			}

			const { data: conflictPages, error } = await query;

			if (error) {
				throw error;
			}

			return (conflictPages || []) as ConflictPage[];
		},
	});
}
