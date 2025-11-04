/**
 * スマートサムネイル更新機能
 * エディターの先頭画像変更を検知してサムネイルを自動更新する
 *
 * @fileoverview 先頭画像の変更検知とサムネイルの賢い自動更新を行うモジュール
 * @version 1.0.0
 * @author AI Assistant
 */

import type { JSONContent } from "@tiptap/core";
import { extractFirstImageUrl } from "./thumbnailExtractor";

/**
 * サムネイル更新判定結果
 */
export interface ThumbnailUpdateDecision {
	shouldUpdate: boolean;
	newThumbnailUrl: string | null;
	currentThumbnailUrl: string | null;
	reason:
		| "no-change"
		| "first-time-set"
		| "first-image-changed"
		| "first-image-removed"
		| "no-image-found";
}

/**
 * サムネイル更新パラメータ
 */
export interface SmartThumbnailUpdateParams {
	/** ページID */
	pageId: string;
	/** 現在のTipTapコンテンツ */
	currentContent: JSONContent;
	/** 現在設定されているサムネイルURL */
	currentThumbnailUrl: string | null;
	/** 強制更新フラグ（デフォルト: false） */
	forceUpdate?: boolean;
}

/**
 * 現在のコンテンツと既存サムネイルを比較して更新が必要かを判定する
 *
 * @param params 更新判定パラメータ
 * @returns 更新判定結果
 */
export function decideThumbnailUpdate(
	params: SmartThumbnailUpdateParams,
): ThumbnailUpdateDecision {
	const { currentContent, currentThumbnailUrl, forceUpdate = false } = params;

	// 現在のコンテンツから先頭画像を抽出
	const firstImageUrl = extractFirstImageUrl(currentContent);

	// 強制更新フラグが設定されている場合
	if (forceUpdate) {
		return {
			shouldUpdate: true,
			newThumbnailUrl: firstImageUrl,
			currentThumbnailUrl,
			reason: firstImageUrl ? "first-image-changed" : "first-image-removed",
		};
	}

	// 現在サムネイルが未設定の場合
	if (!currentThumbnailUrl) {
		if (firstImageUrl) {
			return {
				shouldUpdate: true,
				newThumbnailUrl: firstImageUrl,
				currentThumbnailUrl,
				reason: "first-time-set",
			};
		}
		return {
			shouldUpdate: false,
			newThumbnailUrl: null,
			currentThumbnailUrl,
			reason: "no-image-found",
		};
	}

	// 既存サムネイルが設定されている場合の比較
	if (firstImageUrl) {
		// 先頭画像が変更された場合のみ更新
		if (firstImageUrl !== currentThumbnailUrl) {
			return {
				shouldUpdate: true,
				newThumbnailUrl: firstImageUrl,
				currentThumbnailUrl,
				reason: "first-image-changed",
			};
		}
		return {
			shouldUpdate: false,
			newThumbnailUrl: firstImageUrl,
			currentThumbnailUrl,
			reason: "no-change",
		};
	}
	// 先頭画像が削除された場合、サムネイルをクリア
	return {
		shouldUpdate: true,
		newThumbnailUrl: null,
		currentThumbnailUrl,
		reason: "first-image-removed",
	};
}

/**
 * 2つのJSONContentの先頭画像を比較して変更があったかチェック
 *
 * @param previousContent 以前のコンテンツ
 * @param currentContent 現在のコンテンツ
 * @returns 先頭画像に変更があったかどうか
 */
export function hasFirstImageChanged(
	previousContent: JSONContent,
	currentContent: JSONContent,
): boolean {
	const previousFirstImage = extractFirstImageUrl(previousContent);
	const currentFirstImage = extractFirstImageUrl(currentContent);

	return previousFirstImage !== currentFirstImage;
}

/**
 * サムネイル更新のログメッセージを生成
 *
 * @param pageId ページID
 * @param decision 更新判定結果
 * @returns ログメッセージ
 */
export function generateThumbnailUpdateLog(
	pageId: string,
	decision: ThumbnailUpdateDecision,
): string {
	const { shouldUpdate, newThumbnailUrl, currentThumbnailUrl, reason } =
		decision;

	if (!shouldUpdate) {
		switch (reason) {
			case "no-change":
				return `[SmartThumbnail] ページ ${pageId}: サムネイル変更なし (${currentThumbnailUrl})`;
			case "no-image-found":
				return `[SmartThumbnail] ページ ${pageId}: 画像なし、サムネイル未設定`;
			default:
				return `[SmartThumbnail] ページ ${pageId}: 更新不要 (${reason})`;
		}
	}

	switch (reason) {
		case "first-time-set":
			return `[SmartThumbnail] ページ ${pageId}: 初回サムネイル設定 → ${newThumbnailUrl}`;
		case "first-image-changed":
			return `[SmartThumbnail] ページ ${pageId}: サムネイル変更 ${currentThumbnailUrl} → ${newThumbnailUrl}`;
		case "first-image-removed":
			return `[SmartThumbnail] ページ ${pageId}: 先頭画像削除によりサムネイルクリア ${currentThumbnailUrl} → null`;
		default:
			return `[SmartThumbnail] ページ ${pageId}: サムネイル更新 → ${newThumbnailUrl} (${reason})`;
	}
}

/**
 * デバッグ用: サムネイル判定の詳細情報を出力
 *
 * @param params 更新判定パラメータ
 * @param decision 判定結果
 */
export function debugThumbnailDecision(
	_params: SmartThumbnailUpdateParams,
	_decision: ThumbnailUpdateDecision,
): void {
	if (process.env.NODE_ENV === "development") {
	}
}
