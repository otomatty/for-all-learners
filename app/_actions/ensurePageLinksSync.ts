"use server";

import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";
import { extractLinkData } from "@/lib/utils/linkUtils";
import { updatePageLinks } from "./updatePageLinks";

/**
 * ページリンクの確実な同期を保証する
 * ページリロード時や重要なタイミングで使用
 */
export async function ensurePageLinksSync(pageId: string) {
	const supabase = await createClient();
	// ページ内容を取得
	const { data: page, error: pageError } = await supabase
		.from("pages")
		.select("content_tiptap")
		.eq("id", pageId)
		.single();

	if (pageError || !page || !page.content_tiptap) {
		throw new Error(`Page not found or has no content: ${pageId}`);
	}

	// リンクデータを抽出
	const { outgoingIds } = extractLinkData(page.content_tiptap as JSONContent);

	// リンクを同期
	await updatePageLinks({ pageId, outgoingIds });

	// 存在確認用のページタイトルマップを取得
	const fullText = JSON.stringify(page.content_tiptap);
	const bracketMatches = Array.from(fullText.matchAll(/\[([^[\]]+)\]/g));
	const tagMatches = Array.from(fullText.matchAll(/#([^\s[\]]+)/g));
	const titles = Array.from(
		new Set([
			...bracketMatches.map((m) => m[1]),
			...tagMatches.map((m) => m[1]),
		]),
	);

	const existMap = new Map<string, string | null>();
	if (titles.length > 0) {
		const { data: pages } = await supabase
			.from("pages")
			.select("title,id")
			.in("title", titles);
		const pageMap = new Map<string, string>(
			(pages ?? []).map((p) => [p.title, p.id]),
		);
		for (const t of titles) {
			existMap.set(t, pageMap.get(t) ?? null);
		}
	}

	return {
		success: true,
		existMap: Object.fromEntries(existMap),
		outgoingIds,
	};
}
