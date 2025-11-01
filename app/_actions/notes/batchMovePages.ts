"use server";

import { checkPageConflict } from "./checkPageConflict";
import { getSupabaseClient } from "./getSupabaseClient";
import { linkPageToNote } from "./linkPageToNote";
import { unlinkPageFromNote } from "./unlinkPageFromNote";

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

/**
 * 複数のページを別のノートに移動またはコピーします。
 *
 * @example
 * ```ts
 * import { batchMovePages } from "@/app/_actions/notes";
 *
 * const result = await batchMovePages({
 *   pageIds: ["page1", "page2"],
 *   sourceNoteId: "note-source",
 *   targetNoteId: "note-target",
 *   isCopy: false,
 *   conflictResolutions: [
 *     { pageId: "page1", action: "rename", newTitle: "新しいタイトル" }
 *   ]
 * });
 * ```
 *
 * @param params.pageIds 移動対象のページID配列
 * @param params.sourceNoteId 移動元のノートID
 * @param params.targetNoteId 移動先のノートID
 * @param params.isCopy コピーかどうか（false=移動、true=コピー）
 * @param params.conflictResolutions 競合解決方法の配列
 * @returns 移動結果
 */
export async function batchMovePages({
	pageIds,
	sourceNoteId,
	targetNoteId,
	isCopy = false,
	conflictResolutions = [],
}: {
	pageIds: string[];
	sourceNoteId: string;
	targetNoteId: string;
	isCopy?: boolean;
	conflictResolutions?: ConflictResolution[];
}): Promise<BatchMoveResult> {
	const supabase = await getSupabaseClient();

	const result: BatchMoveResult = {
		success: true,
		movedPages: [],
		conflicts: [],
		errors: [],
	};

	try {
		// ページ情報を取得
		const { data: pages, error: pagesError } = await supabase
			.from("pages")
			.select("id, title")
			.in("id", pageIds);

		if (pagesError) throw pagesError;
		if (!pages) throw new Error("Pages not found");

		// 各ページについて処理
		for (const page of pages) {
			try {
				// 競合解決方法を取得
				const resolution = conflictResolutions.find(
					(r) => r.pageId === page.id,
				);

				// 同名競合をチェック
				const conflicts = await checkPageConflict({
					noteId: targetNoteId,
					pageTitle: page.title,
					excludePageId: isCopy ? undefined : page.id,
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
						await unlinkPageFromNote(targetNoteId, conflictPage.id);
					}
				}

				// ターゲットノートにリンク
				await linkPageToNote(targetNoteId, page.id);

				// 移動の場合は元ノートからリンクを削除
				if (!isCopy && sourceNoteId) {
					await unlinkPageFromNote(sourceNoteId, page.id);
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
	} catch (error) {
		result.success = false;
		result.errors.push({
			pageId: "batch",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}

	return result;
}
