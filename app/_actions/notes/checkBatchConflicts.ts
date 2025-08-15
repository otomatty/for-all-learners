"use server";

import type { ConflictInfo } from "@/app/(protected)/notes/explorer/types";
import { checkPageConflict } from "./checkPageConflict";
import { getSupabaseClient } from "./getSupabaseClient";

/**
 * 複数ページの移動時に発生する競合を一括チェックします。
 *
 * @example
 * ```ts
 * import { checkBatchConflicts } from "@/app/_actions/notes";
 *
 * const conflicts = await checkBatchConflicts({
 *   pageIds: ["page1", "page2"],
 *   targetNoteId: "note-target",
 *   isCopy: false
 * });
 * ```
 *
 * @param params.pageIds チェック対象のページID配列
 * @param params.targetNoteId 移動先のノートID
 * @param params.isCopy コピーかどうか（移動の場合は元ページを除外）
 * @returns 競合情報の配列
 */
export async function checkBatchConflicts({
	pageIds,
	targetNoteId,
	isCopy = false,
}: {
	pageIds: string[];
	targetNoteId: string;
	isCopy?: boolean;
}): Promise<ConflictInfo[]> {
	const supabase = await getSupabaseClient();

	// ページ情報を取得
	const { data: pages, error: pagesError } = await supabase
		.from("pages")
		.select("id, title")
		.in("id", pageIds);

	if (pagesError) throw pagesError;
	if (!pages) return [];

	const conflicts: ConflictInfo[] = [];

	// 各ページについて競合をチェック
	for (const page of pages) {
		const conflictPages = await checkPageConflict({
			noteId: targetNoteId,
			pageTitle: page.title,
			excludePageId: isCopy ? undefined : page.id,
		});

		if (conflictPages.length > 0) {
			// 内容のプレビューを生成（最初の200文字）
			const existingPagesWithPreview = conflictPages.map((conflictPage) => ({
				id: conflictPage.id,
				title: conflictPage.title,
				createdAt: new Date(conflictPage.created_at || new Date()),
				updatedAt: new Date(conflictPage.updated_at || new Date()),
				preview: conflictPage.content_tiptap
					? JSON.stringify(conflictPage.content_tiptap).length > 200
						? `${JSON.stringify(conflictPage.content_tiptap).substring(0, 200)}...`
						: JSON.stringify(conflictPage.content_tiptap)
					: undefined,
			}));

			conflicts.push({
				pageId: page.id,
				pageTitle: page.title,
				existingPages: existingPagesWithPreview,
			});
		}
	}

	return conflicts;
}
