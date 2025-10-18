"use server";

import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";
import { extractLinkData } from "@/lib/utils/linkUtils";
import {
	debugThumbnailDecision,
	decideThumbnailUpdate,
	generateThumbnailUpdateLog,
	type SmartThumbnailUpdateParams,
} from "@/lib/utils/smartThumbnailUpdater";
import { extractFirstImageUrl } from "@/lib/utils/thumbnailExtractor";

export type UpdatePageParams = {
	id: string;
	title: string;
	content: string;
	autoGenerateThumbnail?: boolean; // デフォルト: true
	forceRegenerateThumbnail?: boolean; // 既存サムネイルを上書きするかどうか（デフォルト: false）
	enableSmartThumbnailUpdate?: boolean; // スマートサムネイル更新を有効にするか（デフォルト: true）
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
	forceRegenerateThumbnail = false,
	enableSmartThumbnailUpdate = true,
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

	// 1) 現在のページ情報を取得（既存サムネイルチェック用）
	const { data: currentPage, error: fetchErr } = await supabase
		.from("pages")
		.select("thumbnail_url")
		.eq("id", id)
		.single();

	if (fetchErr) {
		console.error(
			"Failed to fetch current page for thumbnail check:",
			fetchErr,
		);
		throw fetchErr;
	}

	// 2) スマートサムネイル更新ロジック
	let thumbnailUrl: string | null = currentPage.thumbnail_url;

	if (autoGenerateThumbnail) {
		if (enableSmartThumbnailUpdate) {
			// スマートサムネイル更新: 先頭画像の変更を検知して自動更新
			const updateParams: SmartThumbnailUpdateParams = {
				pageId: id,
				currentContent: parsedContent,
				currentThumbnailUrl: currentPage.thumbnail_url,
				forceUpdate: forceRegenerateThumbnail,
			};

			const decision = decideThumbnailUpdate(updateParams);
			debugThumbnailDecision(updateParams, decision);

			if (decision.shouldUpdate) {
				thumbnailUrl = decision.newThumbnailUrl;
				const logMessage = generateThumbnailUpdateLog(id, decision);
				console.log(logMessage);
			} else {
				const logMessage = generateThumbnailUpdateLog(id, decision);
				console.log(logMessage);
			}
		} else {
			// 従来のロジック（後方互換性のため保持）
			if (forceRegenerateThumbnail || !currentPage.thumbnail_url) {
				const extractedThumbnail = extractFirstImageUrl(parsedContent);
				if (extractedThumbnail) {
					thumbnailUrl = extractedThumbnail;
					const action = forceRegenerateThumbnail ? "強制再生成" : "新規生成";
					console.log(
						`[updatePage] ページ ${id}: サムネイル${action} = ${extractedThumbnail}`,
					);
				} else if (forceRegenerateThumbnail) {
					thumbnailUrl = null;
					console.log(
						`[updatePage] ページ ${id}: 画像なしのためサムネイルをクリア`,
					);
				}
			} else {
				console.log(
					`[updatePage] ページ ${id}: 既存サムネイル保持 = ${currentPage.thumbnail_url}`,
				);
			}
		}
	}

	// 3) ページ更新
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

	// 4) page_page_links をリセットして再同期
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
