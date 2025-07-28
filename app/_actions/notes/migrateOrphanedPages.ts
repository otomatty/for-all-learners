"use server";

import { getDefaultNote } from "./getDefaultNote";
import { getSupabaseClient } from "./getSupabaseClient";

/**
 * 既存のノートに紐付いていないページをデフォルトノートに移行します。
 *
 * @example
 * ```ts
 * import { migrateOrphanedPages } from "@/app/_actions/notes";
 *
 * const result = await migrateOrphanedPages();
 * console.log(`${result.migratedCount}件のページを移行しました`);
 * ```
 *
 * @returns 移行結果の詳細
 */
export async function migrateOrphanedPages(): Promise<{
	migratedCount: number;
	orphanedPages: Array<{ id: string; title: string }>;
}> {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	// ユーザーのデフォルトノートを取得（なければ作成）
	const defaultNote = await getDefaultNote();

	// ユーザーの全ページを取得
	const { data: userPages, error: pagesError } = await supabase
		.from("pages")
		.select("id, title")
		.eq("user_id", user.id);

	if (pagesError) throw pagesError;

	if (!userPages || userPages.length === 0) {
		return { migratedCount: 0, orphanedPages: [] };
	}

	// 既にリンクされているページのIDを取得
	const { data: linkedPages, error: linksError } = await supabase
		.from("note_page_links")
		.select("page_id")
		.in(
			"page_id",
			userPages.map((p) => p.id),
		);

	if (linksError) throw linksError;

	const linkedPageIds = new Set(linkedPages?.map((link) => link.page_id) || []);

	// リンクされていないページを特定
	const orphanedPages = userPages.filter((page) => !linkedPageIds.has(page.id));

	if (orphanedPages.length === 0) {
		return { migratedCount: 0, orphanedPages: [] };
	}

	// 孤立ページをデフォルトノートにリンク
	const linkInserts = orphanedPages.map((page) => ({
		note_id: defaultNote.id,
		page_id: page.id,
	}));

	const { error: insertError } = await supabase
		.from("note_page_links")
		.insert(linkInserts);

	if (insertError) throw insertError;

	return {
		migratedCount: orphanedPages.length,
		orphanedPages: orphanedPages.map((p) => ({ id: p.id, title: p.title })),
	};
}
