"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface MoveToTrashParams {
	pageIds: string[];
	noteId: string;
}

export interface MoveToTrashResult {
	success: boolean;
	deletedCount: number;
	message: string;
}

/**
 * 指定されたページをゴミ箱に移動します（ソフト削除）。
 */
export function useMoveNoteToTrash() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			params: MoveToTrashParams,
		): Promise<MoveToTrashResult> => {
			// 現在のユーザーIDを取得
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				throw new Error("認証が必要です");
			}

			// ページの詳細情報を取得
			const { data: pages, error: pagesError } = await supabase
				.from("pages")
				.select("id, title, content_tiptap")
				.in("id", params.pageIds);

			if (pagesError) throw pagesError;
			if (!pages || pages.length === 0) {
				throw new Error("ページが見つかりません");
			}

			// 各ページをゴミ箱に移動
			for (const page of pages) {
				// ゴミ箱テーブルに追加
				const { error: trashError } = await supabase.from("page_trash").insert({
					page_id: page.id,
					user_id: user.id,
					original_note_id: params.noteId,
					page_title: page.title,
					page_content: JSON.stringify(page.content_tiptap),
					metadata: {
						deleted_from_note: params.noteId,
						deleted_by: user.id,
					},
				});

				if (trashError) throw trashError;

				// note_page_linksからリンクを削除
				const { error: unlinkError } = await supabase
					.from("note_page_links")
					.delete()
					.eq("note_id", params.noteId)
					.eq("page_id", page.id);

				if (unlinkError) throw unlinkError;
			}

			return {
				success: true,
				deletedCount: pages.length,
				message: `${pages.length}件のページをゴミ箱に移動しました`,
			};
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["trash-items"] });
			queryClient.invalidateQueries({ queryKey: ["note-pages"] });
		},
	});
}
