"use server";

import { createClient } from "@/lib/supabase/server";
import { extractLinkData } from "@/lib/utils/linkUtils";
import { extractFirstImageUrl } from "@/lib/utils/thumbnailExtractor";
import type { JSONContent } from "@tiptap/core";

export type UpdatePageParams = {
	id: string;
	title: string;
	content: string;
	autoGenerateThumbnail?: boolean; // デフォルト: true
};

/**
 * ページ更新と page_page_links の同期を行うサーバーアクション
 * 自動サムネイル生成機能付き
 */
export async function updatePage({
	id,
	title,
	content,
	autoGenerateThumbnail = true,
}: UpdatePageParams) {
	// content is received as a JSON string; parse to JSONContent
	let parsedContent: JSONContent;
	try {
		parsedContent = JSON.parse(content) as JSONContent;
	} catch (err) {
		console.error("Failed to parse content JSON in updatePage:", err);
		throw err;
	}

	const supabase = await createClient();

	// 1) 自動サムネイル生成
	const thumbnailUrl = autoGenerateThumbnail
		? extractFirstImageUrl(parsedContent)
		: null;

	// ログ出力（デバッグ用）
	if (autoGenerateThumbnail) {
		console.log(
			`[updatePage] ページ ${id}: サムネイル抽出結果 = ${thumbnailUrl || "画像なし"}`,
		);
	}

	// 2) ページ更新
	const { error: pageErr } = await supabase
		.from("pages")
		.update({
			title,
			content_tiptap: parsedContent,
			thumbnail_url: thumbnailUrl,
		})
		.eq("id", id);
	if (pageErr) {
		throw pageErr;
	}

	// 3) page_page_links をリセットして再同期
	const { outgoingIds } = extractLinkData(parsedContent);
	await supabase.from("page_page_links").delete().eq("page_id", id);
	if (outgoingIds.length > 0) {
		const { error: linksErr } = await supabase
			.from("page_page_links")
			.insert(outgoingIds.map((linked_id) => ({ page_id: id, linked_id })));
		if (linksErr) throw linksErr;
	}

	return { success: true };
}
