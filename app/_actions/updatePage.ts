"use server";

import { createClient } from "@/lib/supabase/server";
import type { JSONContent } from "@tiptap/core";
import { extractLinkData } from "@/lib/utils/linkUtils";

export type UpdatePageParams = {
	id: string;
	title: string;
	content: string;
};

/**
 * ページ更新と page_page_links の同期を行うサーバーアクション
 */
export async function updatePage({ id, title, content }: UpdatePageParams) {
	// content is received as a JSON string; parse to JSONContent
	let parsedContent: JSONContent;
	try {
		parsedContent = JSON.parse(content) as JSONContent;
	} catch (err) {
		console.error("Failed to parse content JSON in updatePage:", err);
		throw err;
	}

	const supabase = await createClient();

	// 1) ページ更新＋サムネ・マイグレーションフラグON
	const firstImage = null; // TODO: Gyazo画像のサムネ生成が必要ならここに実装
	const { error: pageErr } = await supabase
		.from("pages")
		.update({
			title,
			content_tiptap: parsedContent,
			thumbnail_url: firstImage,
		})
		.eq("id", id);
	if (pageErr) {
		throw pageErr;
	}

	// 2) page_page_links をリセットして再同期
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
