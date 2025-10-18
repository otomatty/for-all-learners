/**
 * スマートサムネイル更新機能のテスト
 */

import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
	decideThumbnailUpdate,
	generateThumbnailUpdateLog,
	hasFirstImageChanged,
	type SmartThumbnailUpdateParams,
} from "../smartThumbnailUpdater";

describe("smartThumbnailUpdater", () => {
	// テスト用のサンプルコンテンツ
	const contentWithGyazoImage: JSONContent = {
		type: "doc",
		content: [
			{
				type: "gyazoImage",
				attrs: {
					src: "https://i.gyazo.com/abc123.png",
				},
			},
			{
				type: "paragraph",
				content: [{ type: "text", text: "test content" }],
			},
		],
	};

	const contentWithDifferentImage: JSONContent = {
		type: "doc",
		content: [
			{
				type: "gyazoImage",
				attrs: {
					src: "https://i.gyazo.com/xyz789.png",
				},
			},
			{
				type: "paragraph",
				content: [{ type: "text", text: "test content" }],
			},
		],
	};

	const contentWithNoImage: JSONContent = {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [{ type: "text", text: "test content without image" }],
			},
		],
	};

	describe("decideThumbnailUpdate", () => {
		it("サムネイル未設定で画像ありの場合、初回設定を判定する", () => {
			const params: SmartThumbnailUpdateParams = {
				pageId: "test-page",
				currentContent: contentWithGyazoImage,
				currentThumbnailUrl: null,
				forceUpdate: false,
			};

			const result = decideThumbnailUpdate(params);

			expect(result.shouldUpdate).toBe(true);
			expect(result.newThumbnailUrl).toBe("https://i.gyazo.com/abc123.png");
			expect(result.reason).toBe("first-time-set");
		});

		it("サムネイル未設定で画像なしの場合、更新不要を判定する", () => {
			const params: SmartThumbnailUpdateParams = {
				pageId: "test-page",
				currentContent: contentWithNoImage,
				currentThumbnailUrl: null,
				forceUpdate: false,
			};

			const result = decideThumbnailUpdate(params);

			expect(result.shouldUpdate).toBe(false);
			expect(result.newThumbnailUrl).toBe(null);
			expect(result.reason).toBe("no-image-found");
		});

		it("先頭画像が変更された場合、更新を判定する", () => {
			const params: SmartThumbnailUpdateParams = {
				pageId: "test-page",
				currentContent: contentWithDifferentImage,
				currentThumbnailUrl: "https://i.gyazo.com/abc123.png",
				forceUpdate: false,
			};

			const result = decideThumbnailUpdate(params);

			expect(result.shouldUpdate).toBe(true);
			expect(result.newThumbnailUrl).toBe("https://i.gyazo.com/xyz789.png");
			expect(result.reason).toBe("first-image-changed");
		});

		it("先頭画像が同じ場合、更新不要を判定する", () => {
			const params: SmartThumbnailUpdateParams = {
				pageId: "test-page",
				currentContent: contentWithGyazoImage,
				currentThumbnailUrl: "https://i.gyazo.com/abc123.png",
				forceUpdate: false,
			};

			const result = decideThumbnailUpdate(params);

			expect(result.shouldUpdate).toBe(false);
			expect(result.newThumbnailUrl).toBe("https://i.gyazo.com/abc123.png");
			expect(result.reason).toBe("no-change");
		});

		it("先頭画像が削除された場合、サムネイルクリアを判定する", () => {
			const params: SmartThumbnailUpdateParams = {
				pageId: "test-page",
				currentContent: contentWithNoImage,
				currentThumbnailUrl: "https://i.gyazo.com/abc123.png",
				forceUpdate: false,
			};

			const result = decideThumbnailUpdate(params);

			expect(result.shouldUpdate).toBe(true);
			expect(result.newThumbnailUrl).toBe(null);
			expect(result.reason).toBe("first-image-removed");
		});

		it("強制更新フラグが有効な場合、常に更新を判定する", () => {
			const params: SmartThumbnailUpdateParams = {
				pageId: "test-page",
				currentContent: contentWithGyazoImage,
				currentThumbnailUrl: "https://i.gyazo.com/abc123.png",
				forceUpdate: true,
			};

			const result = decideThumbnailUpdate(params);

			expect(result.shouldUpdate).toBe(true);
			expect(result.newThumbnailUrl).toBe("https://i.gyazo.com/abc123.png");
			expect(result.reason).toBe("first-image-changed");
		});
	});

	describe("hasFirstImageChanged", () => {
		it("先頭画像が変更された場合、trueを返す", () => {
			const result = hasFirstImageChanged(
				contentWithGyazoImage,
				contentWithDifferentImage,
			);
			expect(result).toBe(true);
		});

		it("先頭画像が同じ場合、falseを返す", () => {
			const result = hasFirstImageChanged(
				contentWithGyazoImage,
				contentWithGyazoImage,
			);
			expect(result).toBe(false);
		});

		it("画像が追加された場合、trueを返す", () => {
			const result = hasFirstImageChanged(
				contentWithNoImage,
				contentWithGyazoImage,
			);
			expect(result).toBe(true);
		});

		it("画像が削除された場合、trueを返す", () => {
			const result = hasFirstImageChanged(
				contentWithGyazoImage,
				contentWithNoImage,
			);
			expect(result).toBe(true);
		});
	});

	describe("generateThumbnailUpdateLog", () => {
		it("初回設定時の適切なログメッセージを生成する", () => {
			const decision = {
				shouldUpdate: true,
				newThumbnailUrl: "https://i.gyazo.com/abc123.png",
				currentThumbnailUrl: null,
				reason: "first-time-set" as const,
			};

			const log = generateThumbnailUpdateLog("test-page", decision);
			expect(log).toBe(
				"[SmartThumbnail] ページ test-page: 初回サムネイル設定 → https://i.gyazo.com/abc123.png",
			);
		});

		it("画像変更時の適切なログメッセージを生成する", () => {
			const decision = {
				shouldUpdate: true,
				newThumbnailUrl: "https://i.gyazo.com/xyz789.png",
				currentThumbnailUrl: "https://i.gyazo.com/abc123.png",
				reason: "first-image-changed" as const,
			};

			const log = generateThumbnailUpdateLog("test-page", decision);
			expect(log).toBe(
				"[SmartThumbnail] ページ test-page: サムネイル変更 https://i.gyazo.com/abc123.png → https://i.gyazo.com/xyz789.png",
			);
		});

		it("画像削除時の適切なログメッセージを生成する", () => {
			const decision = {
				shouldUpdate: true,
				newThumbnailUrl: null,
				currentThumbnailUrl: "https://i.gyazo.com/abc123.png",
				reason: "first-image-removed" as const,
			};

			const log = generateThumbnailUpdateLog("test-page", decision);
			expect(log).toBe(
				"[SmartThumbnail] ページ test-page: 先頭画像削除によりサムネイルクリア https://i.gyazo.com/abc123.png → null",
			);
		});

		it("変更なし時の適切なログメッセージを生成する", () => {
			const decision = {
				shouldUpdate: false,
				newThumbnailUrl: "https://i.gyazo.com/abc123.png",
				currentThumbnailUrl: "https://i.gyazo.com/abc123.png",
				reason: "no-change" as const,
			};

			const log = generateThumbnailUpdateLog("test-page", decision);
			expect(log).toBe(
				"[SmartThumbnail] ページ test-page: サムネイル変更なし (https://i.gyazo.com/abc123.png)",
			);
		});
	});
});
