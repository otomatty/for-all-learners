/**
 * ページ表示時のサムネイル自動設定機能のテスト
 * autoSetThumbnail機能の条件判定テスト
 *
 * @fileoverview ページ表示時のサムネイル自動設定機能のテスト（条件判定のみ）
 * @version 1.0.0
 * @author AI Assistant
 */

import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { decideThumbnailUpdate } from "@/lib/utils/smartThumbnailUpdater";

// テスト用のサンプルコンテンツ
const pageWithGyazoImage: JSONContent = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [{ type: "text", text: "ページの説明" }],
		},
		{
			type: "gyazoImage",
			attrs: {
				src: "https://i.gyazo.com/test123.png",
			},
		},
		{
			type: "paragraph",
			content: [{ type: "text", text: "画像の後のテキスト" }],
		},
	],
};

const pageWithoutImage: JSONContent = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [{ type: "text", text: "画像がないページ" }],
		},
	],
};

const pageWithDisallowedImage: JSONContent = {
	type: "doc",
	content: [
		{
			type: "image",
			attrs: {
				src: "https://example.com/forbidden.jpg",
			},
		},
	],
};

/**
 * ページ表示時サムネイル自動設定のテストスイート
 */
describe("Page View Auto Thumbnail Setting", () => {
	/**
	 * サムネイル設定条件の判定テスト
	 */
	describe("decideThumbnailUpdate", () => {
		it("サムネイル未設定で画像ありの場合true", () => {
			const result = decideThumbnailUpdate({
				pageId: "test-page-id",
				currentContent: pageWithGyazoImage,
				currentThumbnailUrl: null,
			});

			expect(result.shouldUpdate).toBe(true);
			expect(result.newThumbnailUrl).toBe("https://i.gyazo.com/test123.png");
			expect(result.reason).toBe("first-time-set");
		});

		it("サムネイル設定済みの場合false", () => {
			const result = decideThumbnailUpdate({
				pageId: "test-page-id",
				currentContent: pageWithGyazoImage,
				currentThumbnailUrl: "https://i.gyazo.com/test123.png",
			});

			expect(result.shouldUpdate).toBe(false);
			expect(result.reason).toBe("no-change");
		});

		it("画像がない場合false", () => {
			const result = decideThumbnailUpdate({
				pageId: "test-page-id",
				currentContent: pageWithoutImage,
				currentThumbnailUrl: null,
			});

			expect(result.shouldUpdate).toBe(false);
			expect(result.reason).toBe("no-image-found");
		});

		it("許可されていない画像のみの場合false", () => {
			const result = decideThumbnailUpdate({
				pageId: "test-page-id",
				currentContent: pageWithDisallowedImage,
				currentThumbnailUrl: null,
			});

			expect(result.shouldUpdate).toBe(false);
			expect(result.reason).toBe("no-image-found");
		});
	});

	/**
	 * 画像抽出ロジックのテスト
	 */
	describe("Image Extraction Logic", () => {
		it("Gyazo画像URLを正しく抽出", async () => {
			const { extractFirstImageUrl } = await import(
				"@/lib/utils/thumbnailExtractor"
			);

			const result = extractFirstImageUrl(pageWithGyazoImage);
			expect(result).toBe("https://i.gyazo.com/test123.png");
		});

		it("画像がないページではnullを返す", async () => {
			const { extractFirstImageUrl } = await import(
				"@/lib/utils/thumbnailExtractor"
			);

			const result = extractFirstImageUrl(pageWithoutImage);
			expect(result).toBeNull();
		});

		it("許可されていないドメインは無視", async () => {
			const { extractFirstImageUrl } = await import(
				"@/lib/utils/thumbnailExtractor"
			);

			const result = extractFirstImageUrl(pageWithDisallowedImage);
			expect(result).toBeNull();
		});
	});
});
