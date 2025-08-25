/**
 * ページ表示時のサムネイル自動設定機能
 * サムネイル未設定ページで画像が見つかった場合に自動でサムネイルを設定
 *
 * @fileoverview ページ表示時の軽量なサムネイル自動設定機能
 * @version 1.0.0
 * @author AI Assistant
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { extractFirstImageUrl } from "@/lib/utils/thumbnailExtractor";
import type { JSONContent } from "@tiptap/core";

/**
 * サムネイル自動設定結果の型定義
 */
export interface AutoThumbnailResult {
	/** サムネイルが設定されたかどうか */
	thumbnailSet: boolean;
	/** 設定されたサムネイルURL（設定されなかった場合はnull） */
	thumbnailUrl: string | null;
	/** 処理時間（ミリ秒） */
	processingTimeMs: number;
	/** エラーメッセージ（エラーが発生した場合） */
	error?: string;
}

/**
 * ページ表示時のサムネイル自動設定
 * サムネイル未設定かつ画像が含まれるページでのみサムネイルを自動設定
 *
 * @param pageId 対象ページID
 * @param contentTiptap ページのTipTapコンテンツ
 * @param currentThumbnailUrl 現在のサムネイルURL（nullの場合のみ処理）
 * @returns サムネイル設定結果
 */
export async function autoSetThumbnailOnPageView(
	pageId: string,
	contentTiptap: JSONContent,
	currentThumbnailUrl: string | null,
): Promise<AutoThumbnailResult> {
	const startTime = Date.now();

	// 既にサムネイルが設定されている場合は何もしない
	if (currentThumbnailUrl) {
		return {
			thumbnailSet: false,
			thumbnailUrl: currentThumbnailUrl,
			processingTimeMs: Date.now() - startTime,
		};
	}

	try {
		// コンテンツから画像URLを抽出
		const extractedThumbnail = extractFirstImageUrl(contentTiptap);

		if (!extractedThumbnail) {
			// 画像が見つからない場合
			return {
				thumbnailSet: false,
				thumbnailUrl: null,
				processingTimeMs: Date.now() - startTime,
			};
		}

		// データベースを更新
		const supabase = await createClient();
		const { error: updateError } = await supabase
			.from("pages")
			.update({ thumbnail_url: extractedThumbnail })
			.eq("id", pageId);

		if (updateError) {
			console.error("Failed to auto-set thumbnail:", updateError);
			return {
				thumbnailSet: false,
				thumbnailUrl: null,
				processingTimeMs: Date.now() - startTime,
				error: updateError.message,
			};
		}

		return {
			thumbnailSet: true,
			thumbnailUrl: extractedThumbnail,
			processingTimeMs: Date.now() - startTime,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("autoSetThumbnailOnPageView error:", error);

		return {
			thumbnailSet: false,
			thumbnailUrl: null,
			processingTimeMs: Date.now() - startTime,
			error: errorMessage,
		};
	}
}

/**
 * ページIDでサムネイル自動設定（軽量版）
 * ページデータを内部で取得してサムネイル自動設定を実行
 *
 * @param pageId 対象ページID
 * @returns サムネイル設定結果
 */
export async function autoSetThumbnailById(
	pageId: string,
): Promise<AutoThumbnailResult> {
	const startTime = Date.now();

	try {
		const supabase = await createClient();

		// ページデータを取得
		const { data: page, error: fetchError } = await supabase
			.from("pages")
			.select("id, content_tiptap, thumbnail_url")
			.eq("id", pageId)
			.single();

		if (fetchError || !page) {
			const errorMessage = fetchError?.message || "Page not found";
			return {
				thumbnailSet: false,
				thumbnailUrl: null,
				processingTimeMs: Date.now() - startTime,
				error: errorMessage,
			};
		}

		// サムネイル自動設定を実行
		return await autoSetThumbnailOnPageView(
			pageId,
			page.content_tiptap as JSONContent,
			page.thumbnail_url,
		);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("autoSetThumbnailById error:", error);

		return {
			thumbnailSet: false,
			thumbnailUrl: null,
			processingTimeMs: Date.now() - startTime,
			error: errorMessage,
		};
	}
}

/**
 * サムネイル自動設定の条件チェック
 * ページがサムネイル自動設定の対象かどうかを判定
 *
 * @param page ページデータ
 * @returns 自動設定対象かどうか
 */
export async function shouldAutoSetThumbnail(page: {
	thumbnail_url: string | null;
	content_tiptap: JSONContent;
}): Promise<boolean> {
	// 既にサムネイルが設定されている場合は対象外
	if (page.thumbnail_url) {
		return false;
	}

	// コンテンツに画像が含まれているかチェック
	const hasImage = extractFirstImageUrl(page.content_tiptap) !== null;
	return hasImage;
}
