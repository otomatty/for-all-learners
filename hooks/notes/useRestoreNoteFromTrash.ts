"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLinkPageToNote } from "./useLinkPageToNote";

export interface RestoreFromTrashParams {
	trashIds: string[];
	targetNoteId?: string;
}

export interface RestoreFromTrashResult {
	success: boolean;
	restoredCount: number;
	restoredPages: string[];
	message: string;
}

/**
 * ゴミ箱からページを復元します。
 */
export function useRestoreNoteFromTrash() {
	const supabase = createClient();
	const queryClient = useQueryClient();
	const linkPageToNote = useLinkPageToNote();

	return useMutation({
		mutationFn: async (
			params: RestoreFromTrashParams,
		): Promise<RestoreFromTrashResult> => {
			// 現在のユーザーIDを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				throw new Error("認証が必要です");
			}

			// ゴミ箱アイテムの詳細情報を取得
			const { data: trashItems, error: trashError } = await supabase
				.from("page_trash")
				.select("*")
				.in("id", params.trashIds)
				.eq("user_id", user.id);

			if (trashError) throw trashError;
			if (!trashItems || trashItems.length === 0) {
				throw new Error("ゴミ箱アイテムが見つかりません");
			}

			const restoredPages: string[] = [];

			for (const trashItem of trashItems) {
				// 復元先ノートIDを決定（指定がない場合は元のノート）
				const restoreNoteId = params.targetNoteId || trashItem.original_note_id;

				if (!restoreNoteId) {
					throw new Error(
						`ページ "${trashItem.page_title}" の復元先ノートが特定できません`,
					);
				}

				// ページが削除されていないか確認
				const { data: pageExists, error: pageCheckError } = await supabase
					.from("pages")
					.select("id")
					.eq("id", trashItem.page_id)
					.single();

				if (pageCheckError && pageCheckError.code !== "PGRST116") {
					throw pageCheckError;
				}

				if (!pageExists) {
					// ページが完全に削除されている場合は新規作成
					const { data: newPage, error: createError } = await supabase
						.from("pages")
						.insert({
							user_id: user.id,
							title: trashItem.page_title,
							content_tiptap: trashItem.page_content
								? JSON.parse(trashItem.page_content)
								: { type: "doc", content: [] },
						})
						.select("id")
						.single();

					if (createError) throw createError;

					// 新しいページIDでノートにリンク
					await linkPageToNote.mutateAsync({
						noteId: restoreNoteId,
						pageId: newPage.id,
					});
					restoredPages.push(newPage.id);
				} else {
					// ページが存在する場合はノートにリンク
					await linkPageToNote.mutateAsync({
						noteId: restoreNoteId,
						pageId: trashItem.page_id,
					});
					restoredPages.push(trashItem.page_id);
				}

				// ゴミ箱から削除
				const { error: deleteTrashError } = await supabase
					.from("page_trash")
					.delete()
					.eq("id", trashItem.id);

				if (deleteTrashError) throw deleteTrashError;
			}

			return {
				success: true,
				restoredCount: restoredPages.length,
				restoredPages,
				message: `${restoredPages.length}件のページを復元しました`,
			};
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["trash-items"] });
			queryClient.invalidateQueries({ queryKey: ["note-pages"] });
		},
	});
}
