"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCheckPageConflict } from "./useCheckPageConflict";
import { useLinkPageToNote } from "./useLinkPageToNote";
import { useUnlinkPageFromNote } from "./useUnlinkPageFromNote";

export interface ConflictResolution {
	pageId: string;
	action: "rename" | "manual-rename" | "skip" | "replace";
	newTitle?: string;
}

export interface BatchMoveResult {
	success: boolean;
	movedPages: string[];
	conflicts: Array<{
		pageId: string;
		pageTitle: string;
		conflictingPages: Array<{
			id: string;
			title: string;
			created_at: string | null;
			updated_at: string | null;
			content_tiptap: Record<string, unknown> | null;
		}>;
	}>;
	errors: Array<{
		pageId: string;
		error: string;
	}>;
}

export interface BatchMovePagesParams {
	pageIds: string[];
	sourceNoteId: string;
	targetNoteId: string;
	isCopy?: boolean;
	conflictResolutions?: ConflictResolution[];
}

/**
 * 複数のページを別のノートに移動またはコピーします。
 */
export function useBatchMovePages() {
	const supabase = createClient();
	const queryClient = useQueryClient();
	const checkPageConflict = useCheckPageConflict();
	const linkPageToNote = useLinkPageToNote();
	const unlinkPageFromNote = useUnlinkPageFromNote();

	return useMutation({
		mutationFn: async (
			params: BatchMovePagesParams,
		): Promise<BatchMoveResult> => {
			const result: BatchMoveResult = {
				success: true,
				movedPages: [],
				conflicts: [],
				errors: [],
			};

			// ページ情報を取得
			const { data: pages, error: pagesError } = await supabase
				.from("pages")
				.select("id, title")
				.in("id", params.pageIds);

			if (pagesError) throw pagesError;
			if (!pages) throw new Error("Pages not found");

			// 各ページについて処理
			for (const page of pages) {
				try {
					// 競合解決方法を取得
					const resolution = params.conflictResolutions?.find(
						(r) => r.pageId === page.id,
					);

					// 同名競合をチェック
					const conflicts = await checkPageConflict.mutateAsync({
						noteId: params.targetNoteId,
						pageTitle: page.title,
						excludePageId: params.isCopy ? undefined : page.id,
					});

					if (conflicts.length > 0 && !resolution) {
						// 競合があり、解決方法が指定されていない場合
						result.conflicts.push({
							pageId: page.id,
							pageTitle: page.title,
							conflictingPages: conflicts.map((conflict) => ({
								id: conflict.id,
								title: conflict.title,
								created_at: conflict.created_at,
								updated_at: conflict.updated_at,
								content_tiptap: conflict.content_tiptap as Record<
									string,
									unknown
								> | null,
							})),
						});
						result.success = false;
						continue;
					}

					// タイトル変更が必要な場合
					if (
						(resolution?.action === "rename" ||
							resolution?.action === "manual-rename") &&
						resolution.newTitle
					) {
						await supabase
							.from("pages")
							.update({ title: resolution.newTitle })
							.eq("id", page.id);
					} else if (resolution?.action === "rename" && !resolution.newTitle) {
						// 自動リネームの場合
						const autoTitle = `${page.title} (2)`;
						await supabase
							.from("pages")
							.update({ title: autoTitle })
							.eq("id", page.id);
					} else if (resolution?.action === "skip") {
						// スキップする場合
						continue;
					} else if (resolution?.action === "replace") {
						// 置き換える場合は既存のページを削除
						for (const conflictPage of conflicts) {
							await unlinkPageFromNote.mutateAsync({
								noteId: params.targetNoteId,
								pageId: conflictPage.id,
							});
						}
					}

					// ターゲットノートにリンク
					await linkPageToNote.mutateAsync({
						noteId: params.targetNoteId,
						pageId: page.id,
					});

					// 移動の場合は元ノートからリンクを削除
					if (!params.isCopy && params.sourceNoteId) {
						await unlinkPageFromNote.mutateAsync({
							noteId: params.sourceNoteId,
							pageId: page.id,
						});
					}

					result.movedPages.push(page.id);
				} catch (error) {
					result.errors.push({
						pageId: page.id,
						error: error instanceof Error ? error.message : "Unknown error",
					});
					result.success = false;
				}
			}

			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["note-pages"] });
		},
	});
}
