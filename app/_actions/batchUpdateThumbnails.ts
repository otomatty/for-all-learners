/**
 * ページのサムネイル一括更新機能
 * 既存ページで画像はあるがサムネイルが設定されていないページを対象にバッチ更新
 *
 * @fileoverview 管理者向けのサムネイル一括生成機能
 * @version 1.0.0
 * @author AI Assistant
 */

"use server";

import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";
import { extractFirstImageUrl } from "@/lib/utils/thumbnailExtractor";

/**
 * バッチ更新結果の型定義
 */
export interface BatchUpdateResult {
	/** 処理対象のページ数 */
	totalProcessed: number;
	/** サムネイル生成に成功したページ数 */
	successCount: number;
	/** 失敗したページ数 */
	errorCount: number;
	/** 処理時間（ミリ秒） */
	processingTimeMs: number;
	/** 詳細結果 */
	details: Array<{
		pageId: string;
		title: string;
		success: boolean;
		thumbnailUrl?: string | null;
		error?: string;
	}>;
}

/**
 * サムネイル未設定ページの一括更新
 *
 * @param userId 対象ユーザーID（省略時は全ユーザー）
 * @param dryRun テスト実行モード（実際には更新せずに結果のみ返す）
 * @param limit 処理対象の最大ページ数（デフォルト: 100）
 * @returns バッチ更新結果
 */
export async function batchUpdateMissingThumbnails(
	userId?: string,
	dryRun = false,
	limit = 100,
): Promise<BatchUpdateResult> {
	const startTime = Date.now();
	const supabase = await createClient();

	// 1) サムネイル未設定のページを取得
	let query = supabase
		.from("pages")
		.select("id, title, content_tiptap, user_id")
		.is("thumbnail_url", null)
		.limit(limit);

	if (userId) {
		query = query.eq("user_id", userId);
	}

	const { data: pages, error: fetchError } = await query;

	if (fetchError) {
		console.error("Failed to fetch pages for batch update:", fetchError);
		throw fetchError;
	}

	if (!pages || pages.length === 0) {
		return {
			totalProcessed: 0,
			successCount: 0,
			errorCount: 0,
			processingTimeMs: Date.now() - startTime,
			details: [],
		};
	}

	// 2) 各ページのサムネイル生成を試行
	const results: BatchUpdateResult["details"] = [];
	let successCount = 0;
	let errorCount = 0;

	for (const page of pages) {
		try {
			// コンテンツから画像URL抽出
			const thumbnailUrl = extractFirstImageUrl(
				page.content_tiptap as JSONContent,
			);

			if (thumbnailUrl) {
				// DryRunモードでない場合のみ実際に更新
				if (!dryRun) {
					const { error: updateError } = await supabase
						.from("pages")
						.update({ thumbnail_url: thumbnailUrl })
						.eq("id", page.id);

					if (updateError) {
						throw new Error(`Update failed: ${updateError.message}`);
					}
				}

				results.push({
					pageId: page.id,
					title: page.title,
					success: true,
					thumbnailUrl,
				});

				successCount++;
			} else {
				// 画像が見つからない場合
				results.push({
					pageId: page.id,
					title: page.title,
					success: false,
					error: "画像が見つかりません",
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			results.push({
				pageId: page.id,
				title: page.title,
				success: false,
				error: errorMessage,
			});

			errorCount++;
		}
	}

	const processingTimeMs = Date.now() - startTime;

	return {
		totalProcessed: pages.length,
		successCount,
		errorCount,
		processingTimeMs,
		details: results,
	};
}

/**
 * 特定ユーザーのサムネイル一括更新
 *
 * @param userId 対象ユーザーID
 * @param dryRun テスト実行モード
 * @returns バッチ更新結果
 */
export async function batchUpdateUserThumbnails(
	userId: string,
	dryRun = false,
): Promise<BatchUpdateResult> {
	return batchUpdateMissingThumbnails(userId, dryRun, 1000); // ユーザー単位では上限を多めに
}

/**
 * サムネイル統計情報の取得
 *
 * @param userId 対象ユーザーID（省略時は全ユーザー）
 * @returns サムネイル統計
 */
export async function getThumbnailStats(userId?: string): Promise<{
	totalPages: number;
	withThumbnail: number;
	withoutThumbnail: number;
	withImages: number;
}> {
	const supabase = await createClient();

	// 総ページ数
	let totalQuery = supabase
		.from("pages")
		.select("id", { count: "exact", head: true });

	// サムネイル設定済みページ数
	let withThumbnailQuery = supabase
		.from("pages")
		.select("id", { count: "exact", head: true })
		.not("thumbnail_url", "is", null);

	// サムネイル未設定ページ数
	let withoutThumbnailQuery = supabase
		.from("pages")
		.select("id", { count: "exact", head: true })
		.is("thumbnail_url", null);

	if (userId) {
		totalQuery = totalQuery.eq("user_id", userId);
		withThumbnailQuery = withThumbnailQuery.eq("user_id", userId);
		withoutThumbnailQuery = withoutThumbnailQuery.eq("user_id", userId);
	}

	const [totalResult, withThumbnailResult, withoutThumbnailResult] =
		await Promise.all([totalQuery, withThumbnailQuery, withoutThumbnailQuery]);

	// 画像を含むページ数の概算（実際の画像抽出は重いので簡易チェック）
	// ここでは全てのサムネイル未設定ページが対象と仮定
	const withImages = withoutThumbnailResult.count || 0;

	return {
		totalPages: totalResult.count || 0,
		withThumbnail: withThumbnailResult.count || 0,
		withoutThumbnail: withoutThumbnailResult.count || 0,
		withImages, // 実際にはcontent_tiptapを解析する必要があるが、パフォーマンス考慮で概算
	};
}
