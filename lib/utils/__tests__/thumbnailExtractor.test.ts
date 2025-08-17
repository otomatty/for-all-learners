/**
 * thumbnailExtractor.ts のテスト
 * 自動サムネイル生成機能のテストケース
 *
 * @fileoverview TipTapコンテンツから画像URLを抽出する機能のテストスイート
 * @author AI Assistant
 */

import { describe, it, expect } from "vitest";
import {
	extractFirstImageUrl,
	extractThumbnailInfo,
	isValidImageUrl,
} from "../thumbnailExtractor";
import type { JSONContent } from "@tiptap/core";

/**
 * thumbnailExtractor モジュールのテストスイート
 * 画像抽出機能の正常動作とエラーハンドリングを検証
 */
describe("thumbnailExtractor", () => {
	/**
	 * extractFirstImageUrl 関数のテストケース群
	 * TipTapコンテンツから最初の画像URLを抽出する機能をテスト
	 */
	describe("extractFirstImageUrl", () => {
		it("Gyazo画像を正しく抽出できる", () => {
			const content: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "テスト画像: ",
							},
						],
					},
					{
						type: "gyazoImage",
						attrs: {
							src: "https://i.gyazo.com/abc123.png",
							fullWidth: false,
						},
					},
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "画像の後のテキスト",
							},
						],
					},
				],
			};

			const result = extractFirstImageUrl(content);
			expect(result).toBe("https://i.gyazo.com/abc123.png");
		});

		it("標準image拡張の画像を正しく抽出できる", () => {
			const content: JSONContent = {
				type: "doc",
				content: [
					{
						type: "image",
						attrs: {
							src: "https://i.ytimg.com/vi/test123/hqdefault.jpg",
							alt: "YouTube thumbnail",
						},
					},
				],
			};

			const result = extractFirstImageUrl(content);
			expect(result).toBe("https://i.ytimg.com/vi/test123/hqdefault.jpg");
		});

		it("複数画像がある場合、最初の画像を返す", () => {
			const content: JSONContent = {
				type: "doc",
				content: [
					{
						type: "gyazoImage",
						attrs: {
							src: "https://i.gyazo.com/first.png",
						},
					},
					{
						type: "image",
						attrs: {
							src: "https://i.ytimg.com/vi/second/hqdefault.jpg",
						},
					},
					{
						type: "gyazoImage",
						attrs: {
							src: "https://i.gyazo.com/third.png",
						},
					},
				],
			};

			const result = extractFirstImageUrl(content);
			expect(result).toBe("https://i.gyazo.com/first.png");
		});

		it("許可されていないドメインの画像は無視する", () => {
			const content: JSONContent = {
				type: "doc",
				content: [
					{
						type: "image",
						attrs: {
							src: "https://example.com/malicious.jpg", // 許可されていないドメイン
						},
					},
					{
						type: "gyazoImage",
						attrs: {
							src: "https://i.gyazo.com/valid.png", // 許可されているドメイン
						},
					},
				],
			};

			const result = extractFirstImageUrl(content);
			expect(result).toBe("https://i.gyazo.com/valid.png");
		});

		it("画像が見つからない場合はnullを返す", () => {
			const content: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "テキストのみで画像なし",
							},
						],
					},
				],
			};

			const result = extractFirstImageUrl(content);
			expect(result).toBeNull();
		});

		it("空のコンテンツの場合はnullを返す", () => {
			const content: JSONContent = {
				type: "doc",
				content: [],
			};

			const result = extractFirstImageUrl(content);
			expect(result).toBeNull();
		});

		it("不正なコンテンツの場合はnullを返す", () => {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			expect(extractFirstImageUrl(null as any)).toBeNull();
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			expect(extractFirstImageUrl(undefined as any)).toBeNull();
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			expect(extractFirstImageUrl("invalid" as any)).toBeNull();
		});

		it("ネストされた構造でも画像を見つけられる", () => {
			const content: JSONContent = {
				type: "doc",
				content: [
					{
						type: "blockquote",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										text: "引用内の画像: ",
									},
									{
										type: "gyazoImage",
										attrs: {
											src: "https://i.gyazo.com/nested.png",
										},
									},
								],
							},
						],
					},
				],
			};

			const result = extractFirstImageUrl(content);
			expect(result).toBe("https://i.gyazo.com/nested.png");
		});
	});

	/**
	 * extractThumbnailInfo 関数のテストケース群
	 * 詳細な画像情報を抽出する機能をテスト
	 */
	describe("extractThumbnailInfo", () => {
		it("詳細な画像情報を正しく返す", () => {
			const content: JSONContent = {
				type: "doc",
				content: [
					{
						type: "gyazoImage",
						attrs: {
							src: "https://i.gyazo.com/test.png",
						},
					},
					{
						type: "image",
						attrs: {
							src: "https://i.ytimg.com/vi/test/hqdefault.jpg",
						},
					},
				],
			};

			const result = extractThumbnailInfo(content);
			expect(result).toEqual({
				thumbnailUrl: "https://i.gyazo.com/test.png",
				imageCount: 2,
				extractedFrom: "gyazoImage",
			});
		});

		it("画像がない場合の詳細情報", () => {
			const content: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "テキストのみ" }],
					},
				],
			};

			const result = extractThumbnailInfo(content);
			expect(result).toEqual({
				thumbnailUrl: null,
				imageCount: 0,
				extractedFrom: null,
			});
		});
	});

	/**
	 * isValidImageUrl 関数のテストケース群
	 * 画像URLの有効性をチェックする機能をテスト
	 */
	describe("isValidImageUrl", () => {
		it("有効なGyazo URLを認識する", () => {
			expect(isValidImageUrl("https://i.gyazo.com/test.png")).toBe(true);
			expect(isValidImageUrl("https://gyazo.com/test")).toBe(true);
		});

		it("有効なYouTube サムネイルURLを認識する", () => {
			expect(
				isValidImageUrl("https://i.ytimg.com/vi/test123/hqdefault.jpg"),
			).toBe(true);
		});

		it("無効なURLを拒否する", () => {
			expect(isValidImageUrl("https://example.com/image.jpg")).toBe(false);
			expect(isValidImageUrl("invalid-url")).toBe(false);
			expect(isValidImageUrl("")).toBe(false);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			expect(isValidImageUrl(null as any)).toBe(false);
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			expect(isValidImageUrl(undefined as any)).toBe(false);
		});
	});
});
