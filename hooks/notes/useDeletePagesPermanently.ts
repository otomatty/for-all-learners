"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface DeletePagesPermanentlyParams {
	pageIds: string[];
}

export interface DeletePagesPermanentlyResult {
	success: boolean;
	deletedCount: number;
	message: string;
}

/**
 * ページを完全に削除します（元に戻せません）。
 */
export function useDeletePagesPermanently() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			params: DeletePagesPermanentlyParams,
		): Promise<DeletePagesPermanentlyResult> => {
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
				.select("id, title")
				.in("id", params.pageIds);

			if (pagesError) throw pagesError;
			if (!pages || pages.length === 0) {
				throw new Error("ページが見つかりません");
			}

			// ページに関連するゴミ箱エントリを削除
			const { error: trashDeleteError } = await supabase
				.from("page_trash")
				.delete()
				.in("page_id", params.pageIds)
				.eq("user_id", user.id);

			if (trashDeleteError) throw trashDeleteError;

			// note_page_linksからリンクを削除
			const { error: linkDeleteError } = await supabase
				.from("note_page_links")
				.delete()
				.in("page_id", params.pageIds);

			if (linkDeleteError) throw linkDeleteError;

			// ページ自体を削除
			const { error: pageDeleteError } = await supabase
				.from("pages")
				.delete()
				.in("id", params.pageIds);

			if (pageDeleteError) throw pageDeleteError;

			return {
				success: true,
				deletedCount: pages.length,
				message: `${pages.length}件のページを完全に削除しました`,
			};
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["trash-items"] });
			queryClient.invalidateQueries({ queryKey: ["note-pages"] });
		},
	});
}
