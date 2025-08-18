/**
 * TipTap JSONContent から画像URLを抽出するユーティリティ
 * 自動サムネイル生成機能で使用
 *
 * @fileoverview TipTapエディタのJSONContentから画像を抽出してサムネイル生成に使用するモジュール
 * @version 1.0.0
 * @author AI Assistant
 */

import type { JSONContent } from "@tiptap/core";
import {
	ALLOWED_IMAGE_DOMAINS,
	isAllowedImageDomain,
} from "./domainValidation";

/**
 * 画像抽出結果の型定義
 */
export interface ThumbnailExtractionResult {
	thumbnailUrl: string | null;
	imageCount: number;
	extractedFrom: "gyazoImage" | "image" | null;
}

/**
 * TipTap JSONContent から最初の画像URLを抽出
 *
 * @param content TipTapのJSONContent
 * @returns 最初に見つかった有効な画像のURL、見つからない場合はnull
 */
export function extractFirstImageUrl(content: JSONContent): string | null {
	// 再帰的にノードを探索
	function traverse(node: JSONContent): string | null {
		// 現在のノードが画像ノードかチェック
		if (node.type === "gyazoImage" || node.type === "image") {
			const src = node.attrs?.src;
			if (typeof src === "string" && src.trim() !== "") {
				// ドメイン許可チェック
				if (isAllowedImageDomain(src)) {
					return src;
				}
				console.warn(`Image URL from disallowed domain: ${src}`);
			}
		}

		// 子ノードを再帰的に探索（深度優先探索で最初の画像を見つける）
		if (node.content && Array.isArray(node.content)) {
			for (const child of node.content) {
				const result = traverse(child);
				if (result) {
					return result; // 最初に見つかった画像を返す
				}
			}
		}

		return null;
	}

	// コンテンツが存在しない場合の対応
	if (!content || typeof content !== "object") {
		return null;
	}

	return traverse(content);
}

/**
 * TipTap JSONContent から詳細な画像情報を抽出
 *
 * @param content TipTapのJSONContent
 * @returns 画像抽出結果の詳細情報
 */
export function extractThumbnailInfo(
	content: JSONContent,
): ThumbnailExtractionResult {
	let imageCount = 0;
	let firstImageUrl: string | null = null;
	let extractedFrom: "gyazoImage" | "image" | null = null;

	function traverse(node: JSONContent): void {
		// 画像ノードの場合
		if (node.type === "gyazoImage" || node.type === "image") {
			const src = node.attrs?.src;
			if (typeof src === "string" && src.trim() !== "") {
				imageCount++;

				// 最初の有効な画像のみ記録
				if (!firstImageUrl && isAllowedImageDomain(src)) {
					firstImageUrl = src;
					extractedFrom = node.type as "gyazoImage" | "image";
				}
			}
		}

		// 子ノードを再帰的に探索
		if (node.content && Array.isArray(node.content)) {
			for (const child of node.content) {
				traverse(child);
			}
		}
	}

	// コンテンツが存在しない場合の対応
	if (!content || typeof content !== "object") {
		return {
			thumbnailUrl: null,
			imageCount: 0,
			extractedFrom: null,
		};
	}

	traverse(content);

	return {
		thumbnailUrl: firstImageUrl,
		imageCount,
		extractedFrom,
	};
}

/**
 * URLが有効な画像URLかどうかをチェック
 *
 * @param url チェック対象のURL
 * @returns 有効な画像URLかどうか
 */
export function isValidImageUrl(url: string): boolean {
	if (!url || typeof url !== "string" || url.trim() === "") {
		return false;
	}

	// ドメインチェック
	if (!isAllowedImageDomain(url)) {
		return false;
	}

	// 一般的な画像拡張子チェック（オプション）
	const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
	const urlLower = url.toLowerCase();

	// Gyazo URLは特別扱い（拡張子がない場合もある）
	if (urlLower.includes("gyazo.com")) {
		return true;
	}

	// その他の画像URLは拡張子をチェック
	return imageExtensions.some((ext) => urlLower.includes(ext));
}
