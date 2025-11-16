"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCheckPageConflict } from "./useCheckPageConflict";

export interface ConflictInfo {
	pageId: string;
	pageTitle: string;
	existingPages: Array<{
		id: string;
		title: string;
		createdAt: Date;
		updatedAt: Date;
		preview?: string;
	}>;
}

export interface CheckBatchConflictsParams {
	pageIds: string[];
	targetNoteId: string;
	isCopy?: boolean;
}

/**
 * 複数ページの移動時に発生する競合を一括チェックします。
 */
export function useCheckBatchConflicts() {
	const supabase = createClient();
	const checkPageConflict = useCheckPageConflict();

	return useMutation({
		mutationFn: async (
			params: CheckBatchConflictsParams,
		): Promise<ConflictInfo[]> => {
			// ページ情報を取得
			const { data: pages, error: pagesError } = await supabase
				.from("pages")
				.select("id, title")
				.in("id", params.pageIds);

			if (pagesError) throw pagesError;
			if (!pages) return [];

			const conflicts: ConflictInfo[] = [];

			// 各ページについて競合をチェック
			for (const page of pages) {
				const conflictPages = await checkPageConflict.mutateAsync({
					noteId: params.targetNoteId,
					pageTitle: page.title,
					excludePageId: params.isCopy ? undefined : page.id,
				});

				if (conflictPages.length > 0) {
					// 内容のプレビューを生成（最初の200文字）
					const existingPagesWithPreview = conflictPages.map(
						(conflictPage) => ({
							id: conflictPage.id,
							title: conflictPage.title,
							createdAt: new Date(conflictPage.created_at || new Date()),
							updatedAt: new Date(conflictPage.updated_at || new Date()),
							preview: conflictPage.content_tiptap
								? JSON.stringify(conflictPage.content_tiptap).length > 200
									? `${JSON.stringify(conflictPage.content_tiptap).substring(0, 200)}...`
									: JSON.stringify(conflictPage.content_tiptap)
								: undefined,
						}),
					);

					conflicts.push({
						pageId: page.id,
						pageTitle: page.title,
						existingPages: existingPagesWithPreview,
					});
				}
			}

			return conflicts;
		},
	});
}
