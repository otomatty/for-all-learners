"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type DuplicatePageParams = {
	originalPageId: string;
	/** 複製後のページタイトル（指定されない場合は元のタイトル + " copy"） */
	newTitle?: string;
	/** 同じnoteに紐付けるかどうか（falseの場合は独立したページとして作成） */
	linkToSameNote?: boolean;
};

/**
 * ページを複製します。
 * @param params 複製パラメータ
 * @returns 複製されたページの情報
 */
export async function duplicatePage({
	originalPageId,
	newTitle,
	linkToSameNote = true,
}: DuplicatePageParams): Promise<Database["public"]["Tables"]["pages"]["Row"]> {
	const supabase = await createClient();

	// ユーザー認証チェック
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		throw new Error("認証が必要です");
	}

	// 元のページデータを取得
	const { data: originalPage, error: originalError } = await supabase
		.from("pages")
		.select("*")
		.eq("id", originalPageId)
		.single();

	if (originalError || !originalPage) {
		throw originalError || new Error("元のページが見つかりません");
	}

	// ユーザーが元のページの所有者であるかチェック
	if (originalPage.user_id !== user.id) {
		throw new Error("このページを複製する権限がありません");
	}

	// 複製ページのタイトルを決定
	const duplicateTitle = newTitle || `${originalPage.title} copy`;

	// 新しいページを作成
	const { data: newPage, error: createError } = await supabase
		.from("pages")
		.insert({
			user_id: originalPage.user_id,
			title: duplicateTitle,
			content_tiptap: originalPage.content_tiptap,
			is_public: originalPage.is_public,
			// サムネイルはコピーしない（新しいページには新しいサムネイルを生成させる）
			thumbnail_url: null,
		})
		.select("*")
		.single();

	if (createError || !newPage) {
		throw createError || new Error("ページの複製に失敗しました");
	}

	// 同じnoteに紐付ける場合、元のページのnoteリンクを複製
	if (linkToSameNote) {
		const { data: noteLinks, error: noteLinksError } = await supabase
			.from("note_page_links")
			.select("note_id")
			.eq("page_id", originalPageId);

		if (noteLinksError) {
			throw noteLinksError;
		}

		if (noteLinks && noteLinks.length > 0) {
			const inserts = noteLinks.map((link) => ({
				note_id: link.note_id,
				page_id: newPage.id,
			}));

			const { error: linkError } = await supabase
				.from("note_page_links")
				.insert(inserts);

			if (linkError) {
				throw linkError;
			}
		}
	}

	return newPage;
}
