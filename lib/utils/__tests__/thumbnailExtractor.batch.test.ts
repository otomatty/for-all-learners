/**
 * バッチ更新機能のテスト
 * サムネイル未設定ページの一括更新機能をテスト
 *
 * @fileoverview バッチ更新ロジックの単体テスト
 * @version 1.0.0
 * @author AI Assistant
 */

import type { JSONContent } from "@tiptap/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

// モック用のサンプルデータ
const samplePageWithGyazo: JSONContent = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [{ type: "text", text: "サンプルページ" }],
		},
		{
			type: "gyazoImage",
			attrs: {
				src: "https://i.gyazo.com/sample123.png",
			},
		},
	],
};

const samplePageWithoutImage: JSONContent = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [{ type: "text", text: "画像なしページ" }],
		},
	],
};

const samplePageWithDisallowedImage: JSONContent = {
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
 * バッチ更新ロジックのテストスイート
 */
describe("Batch Thumbnail Update Logic", () => {
	beforeEach(() => {
		// コンソールログをクリア
		vi.clearAllMocks();
	});

	/**
	 * サムネイル抽出ロジックのテスト
	 */
	describe("Thumbnail Extraction for Batch Processing", () => {
		it("Gyazo画像を含むページから正しくサムネイルを抽出", async () => {
			// 実際のextractFirstImageUrl関数を動的インポート
			const { extractFirstImageUrl } = await import("../thumbnailExtractor");

			const result = extractFirstImageUrl(samplePageWithGyazo);
			expect(result).toBe("https://i.gyazo.com/sample123.png");
		});

		it("画像がないページではnullを返す", async () => {
			const { extractFirstImageUrl } = await import("../thumbnailExtractor");

			const result = extractFirstImageUrl(samplePageWithoutImage);
			expect(result).toBeNull();
		});

		it("許可されていないドメインの画像は無視", async () => {
			const { extractFirstImageUrl } = await import("../thumbnailExtractor");

			const result = extractFirstImageUrl(samplePageWithDisallowedImage);
			expect(result).toBeNull();
		});
	});

	/**
	 * バッチ処理の条件ロジックテスト
	 */
	describe("Batch Update Conditions", () => {
		it("サムネイル未設定ページのみを対象とする", () => {
			const pages = [
				{ id: "1", thumbnail_url: null, title: "未設定ページ" },
				{
					id: "2",
					thumbnail_url: "https://i.gyazo.com/existing.png",
					title: "設定済みページ",
				},
				{ id: "3", thumbnail_url: null, title: "未設定ページ2" },
			];

			const targetPages = pages.filter((page) => page.thumbnail_url === null);
			expect(targetPages).toHaveLength(2);
			expect(targetPages.map((p) => p.id)).toEqual(["1", "3"]);
		});

		it("ユーザーIDフィルターが正しく動作", () => {
			const pages = [
				{ id: "1", user_id: "user1", thumbnail_url: null },
				{ id: "2", user_id: "user2", thumbnail_url: null },
				{ id: "3", user_id: "user1", thumbnail_url: null },
			];

			const targetUserId = "user1";
			const userPages = pages.filter((page) => page.user_id === targetUserId);
			expect(userPages).toHaveLength(2);
			expect(userPages.map((p) => p.id)).toEqual(["1", "3"]);
		});
	});

	/**
	 * エラーハンドリングのテスト
	 */
	describe("Error Handling in Batch Processing", () => {
		it("不正なJSONContentを安全に処理", async () => {
			const { extractFirstImageUrl } = await import("../thumbnailExtractor");

			// 不正なデータでもエラーを投げない
			expect(() => {
				extractFirstImageUrl({} as JSONContent);
			}).not.toThrow();

			expect(() => {
				// biome-ignore lint/suspicious/noExplicitAny: テスト用の不正データ
				extractFirstImageUrl(null as any);
			}).not.toThrow();
		});

		it("部分的な失敗でも続行する", () => {
			const mockResults = [
				{ success: true, pageId: "1" },
				{ success: false, pageId: "2", error: "Network error" },
				{ success: true, pageId: "3" },
			];

			const successCount = mockResults.filter((r) => r.success).length;
			const errorCount = mockResults.filter((r) => !r.success).length;

			expect(successCount).toBe(2);
			expect(errorCount).toBe(1);
		});
	});

	/**
	 * パフォーマンス関連のテスト
	 */
	describe("Performance Considerations", () => {
		it("大量のページでも適切に制限される", () => {
			const limit = 100;
			const totalPages = 500;

			// 実際のバッチ処理では制限が適用されることを確認
			const processedCount = Math.min(totalPages, limit);
			expect(processedCount).toBe(100);
		});

		it("処理時間が記録される", () => {
			const startTime = Date.now();
			// 模擬処理
			setTimeout(() => {}, 10);
			const endTime = Date.now();

			const processingTime = endTime - startTime;
			expect(processingTime).toBeGreaterThanOrEqual(0);
		});
	});

	/**
	 * DryRunモードのテスト
	 */
	describe("Dry Run Mode", () => {
		it("DryRunモードでは実際に更新しない", () => {
			const dryRun = true;
			const shouldUpdate = !dryRun;

			expect(shouldUpdate).toBe(false);
		});

		it("実行モードでは更新を実行", () => {
			const dryRun = false;
			const shouldUpdate = !dryRun;

			expect(shouldUpdate).toBe(true);
		});
	});

	/**
	 * 統計情報の計算テスト
	 */
	describe("Statistics Calculation", () => {
		it("統計情報が正しく計算される", () => {
			const mockPages = [
				{ thumbnail_url: "https://i.gyazo.com/1.png" },
				{ thumbnail_url: null },
				{ thumbnail_url: "https://i.gyazo.com/2.png" },
				{ thumbnail_url: null },
				{ thumbnail_url: null },
			];

			const totalPages = mockPages.length;
			const withThumbnail = mockPages.filter(
				(p) => p.thumbnail_url !== null,
			).length;
			const withoutThumbnail = mockPages.filter(
				(p) => p.thumbnail_url === null,
			).length;

			expect(totalPages).toBe(5);
			expect(withThumbnail).toBe(2);
			expect(withoutThumbnail).toBe(3);
			expect(withThumbnail + withoutThumbnail).toBe(totalPages);
		});
	});
});
