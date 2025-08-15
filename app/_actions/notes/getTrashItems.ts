"use server";

import { getSupabaseClient } from "./getSupabaseClient";

export interface TrashItem {
	id: string;
	pageId: string;
	pageTitle: string;
	pageContent?: string | null;
	originalNoteId?: string | null;
	originalNoteTitle?: string;
	deletedAt: Date;
	autoDeleteAt?: Date | null;
	metadata: Record<string, unknown> | null;
}

/**
 * ユーザーのゴミ箱アイテム一覧を取得します。
 *
 * @example
 * ```ts
 * import { getTrashItems } from "@/app/_actions/notes";
 *
 * const trashItems = await getTrashItems({
 *   limit: 50,
 *   offset: 0
 * });
 * ```
 *
 * @param params.limit 取得件数制限（デフォルト: 100）
 * @param params.offset 取得開始位置（デフォルト: 0）
 * @returns ゴミ箱アイテム一覧
 */
export async function getTrashItems({
	limit = 100,
	offset = 0,
}: {
	limit?: number;
	offset?: number;
} = {}) {
	const supabase = await getSupabaseClient();

	try {
		// 現在のユーザーIDを取得
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();
		if (userError || !user) {
			throw new Error("認証が必要です");
		}

		// ゴミ箱アイテムを取得（元のノート情報も含む）
		const { data: trashItems, error: trashError } = await supabase
			.from("page_trash")
			.select(`
				id,
				page_id,
				page_title,
				page_content,
				original_note_id,
				deleted_at,
				auto_delete_at,
				metadata,
				notes:original_note_id (
					title
				)
			`)
			.eq("user_id", user.id)
			.order("deleted_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (trashError) throw trashError;

		// データを整形
		const formattedTrashItems: TrashItem[] = (trashItems || []).map((item) => ({
			id: item.id,
			pageId: item.page_id,
			pageTitle: item.page_title,
			pageContent: item.page_content,
			originalNoteId: item.original_note_id,
			originalNoteTitle: item.notes?.title,
			deletedAt: new Date(item.deleted_at || new Date()),
			autoDeleteAt: item.auto_delete_at ? new Date(item.auto_delete_at) : null,
			metadata:
				typeof item.metadata === "object" && item.metadata !== null
					? (item.metadata as Record<string, unknown>)
					: {},
		}));

		// 総件数を取得
		const { count, error: countError } = await supabase
			.from("page_trash")
			.select("*", { count: "exact", head: true })
			.eq("user_id", user.id);

		if (countError) throw countError;

		return {
			success: true,
			trashItems: formattedTrashItems,
			totalCount: count || 0,
			hasMore: offset + limit < (count || 0),
		};
	} catch (error) {
		console.error("Get trash items error:", error);
		return {
			success: false,
			trashItems: [],
			totalCount: 0,
			hasMore: false,
			message:
				error instanceof Error ? error.message : "ゴミ箱の取得に失敗しました",
		};
	}
}
