/**
 * resolver-queue.ts のユニットテスト
 * 解決キュー処理の設定値テスト
 *
 * Note: resolver-queue の実際の動作テストは、外部依存が多いため
 * 統合テストで実施します。ここでは設定値のみをテストします。
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import logger from "../../../logger";
import { RESOLVER_CONFIG } from "../config";
import { enqueueResolve } from "../resolver-queue";

describe("UnifiedLinkMark Resolver Queue Config", () => {
	describe("RESOLVER_CONFIG", () => {
		it("should have correct batch size", () => {
			expect(RESOLVER_CONFIG.batchSize).toBe(10);
		});

		it("should have correct batch delay", () => {
			expect(RESOLVER_CONFIG.batchDelay).toBe(50);
		});

		it("should have correct max retries", () => {
			expect(RESOLVER_CONFIG.maxRetries).toBe(2);
		});

		it("should have correct retry delay base", () => {
			expect(RESOLVER_CONFIG.retryDelayBase).toBe(100);
		});

		it("should calculate exponential backoff correctly", () => {
			// First retry: 100 * 2^0 = 100ms
			const firstRetryDelay = RESOLVER_CONFIG.retryDelayBase * 2 ** 0;
			expect(firstRetryDelay).toBe(100);

			// Second retry: 100 * 2^1 = 200ms
			const secondRetryDelay = RESOLVER_CONFIG.retryDelayBase * 2 ** 1;
			expect(secondRetryDelay).toBe(200);

			// Third retry (if maxRetries was higher): 100 * 2^2 = 400ms
			const thirdRetryDelay = RESOLVER_CONFIG.retryDelayBase * 2 ** 2;
			expect(thirdRetryDelay).toBe(400);
		});
	});

	describe("External URL handling (Issue #138)", () => {
		let editor: Editor;

		beforeEach(() => {
			editor = new Editor({
				extensions: [StarterKit],
				content: "",
			});
		});

		afterEach(() => {
			editor?.destroy();
		});

		it("should skip resolution for https:// URLs", () => {
			// Mock logger.debug to track if skip message is logged
			const debugSpy = vi.spyOn(logger, "debug").mockImplementation(() => {});

			// Try to enqueue external URL
			enqueueResolve({
				key: "https://example.com",
				raw: "https://example.com",
				markId: "test-mark-id",
				editor,
				variant: "bracket",
			});

			// Should log skip message
			expect(debugSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					raw: "https://example.com",
					markId: "test-mark-id",
				}),
				expect.stringContaining("Skipping external URL"),
			);

			debugSpy.mockRestore();
		});

		it("should skip resolution for http:// URLs", () => {
			const debugSpy = vi.spyOn(logger, "debug").mockImplementation(() => {});

			enqueueResolve({
				key: "http://example.com",
				raw: "http://example.com",
				markId: "test-mark-id-2",
				editor,
				variant: "bracket",
			});

			expect(debugSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					raw: "http://example.com",
					markId: "test-mark-id-2",
				}),
				expect.stringContaining("Skipping external URL"),
			);

			debugSpy.mockRestore();
		});

		it("should not skip resolution for internal links", () => {
			const debugSpy = vi.spyOn(logger, "debug").mockImplementation(() => {});

			enqueueResolve({
				key: "internal-page",
				raw: "Internal Page",
				markId: "test-mark-id-3",
				editor,
				variant: "bracket",
			});

			// Should not log skip message for internal links
			const skipCalls = debugSpy.mock.calls.filter((call) =>
				call[1]?.toString().includes("Skipping external URL"),
			);
			expect(skipCalls.length).toBe(0);

			debugSpy.mockRestore();
		});
	});
});
