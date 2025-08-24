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
	describe("shouldAutoSetThumbnail", () => {
		it("サムネイル未設定で画像ありの場合true", async () => {
			const { shouldAutoSetThumbnail } = await import(
				"@/app/_actions/autoSetThumbnail"
			);

			const result = await shouldAutoSetThumbnail({
				thumbnail_url: null,
				content_tiptap: pageWithGyazoImage,
			});

			expect(result).toBe(true);
		});

		it("サムネイル設定済みの場合false", async () => {
			const { shouldAutoSetThumbnail } = await import(
				"@/app/_actions/autoSetThumbnail"
			);

			const result = await shouldAutoSetThumbnail({
				thumbnail_url: "https://i.gyazo.com/existing.png",
				content_tiptap: pageWithGyazoImage,
			});

			expect(result).toBe(false);
		});

		it("画像がない場合false", async () => {
			const { shouldAutoSetThumbnail } = await import(
				"@/app/_actions/autoSetThumbnail"
			);

			const result = await shouldAutoSetThumbnail({
				thumbnail_url: null,
				content_tiptap: pageWithoutImage,
			});

			expect(result).toBe(false);
		});

		it("許可されていない画像のみの場合false", async () => {
			const { shouldAutoSetThumbnail } = await import(
				"@/app/_actions/autoSetThumbnail"
			);

			const result = await shouldAutoSetThumbnail({
				thumbnail_url: null,
				content_tiptap: pageWithDisallowedImage,
			});

			expect(result).toBe(false);
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
