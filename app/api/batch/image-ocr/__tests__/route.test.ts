/**
 * Tests for Image Batch OCR API Route (Phase 4.1)
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/batch/image-ocr/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ app/_actions/transcribeImageBatch.ts (transcribeImagesBatch - mocked)
 *   ├─ lib/supabase/server.ts (createClient - mocked)
 *   └─ lib/logger.ts (logger - mocked)
 *
 * Related Files:
 *   ├─ Spec: ../route.spec.md
 *   └─ Implementation: ../route.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/app/_actions/transcribeImageBatch");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import type { NextRequest } from "next/server";
import { transcribeImagesBatch } from "@/app/_actions/transcribeImageBatch";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

// Helper: Create mock NextRequest
function createMockRequest(body: unknown): NextRequest {
	return {
		json: async () => body,
	} as NextRequest;
}

// Helper: Create mock Supabase client
function createMockSupabaseClient(user: { id: string } | null = { id: "user-1" }) {
	return {
		auth: {
			getUser: async () => ({
				data: { user },
				error: user ? null : { message: "Not authenticated" },
			}),
		},
	};
}

describe("POST /api/batch/image-ocr", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================
	// TC-001: 基本的なバッチOCR処理
	// ========================================
	describe("TC-001: Basic batch OCR processing", () => {
		it("should process images and return extracted text", async () => {
			const mockPages = [
				{ pageNumber: 1, imageUrl: "https://example.com/image1.png" },
				{ pageNumber: 2, imageUrl: "https://example.com/image2.png" },
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(transcribeImagesBatch).mockResolvedValue({
				success: true,
				message: "バッチOCR処理完了: 2/2ページ処理成功",
				extractedPages: [
					{ pageNumber: 1, text: "Extracted text 1" },
					{ pageNumber: 2, text: "Extracted text 2" },
				],
				processedCount: 2,
				skippedCount: 0,
			});

			const request = createMockRequest({
				pages: mockPages,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.extractedPages).toHaveLength(2);
			expect(data.processedCount).toBe(2);
			expect(transcribeImagesBatch).toHaveBeenCalledWith(mockPages, 4);
		});
	});

	// ========================================
	// TC-002: バッチサイズの指定
	// ========================================
	describe("TC-002: Batch size specification", () => {
		it("should use specified batch size", async () => {
			const mockPages = [
				{ pageNumber: 1, imageUrl: "https://example.com/image1.png" },
				{ pageNumber: 2, imageUrl: "https://example.com/image2.png" },
				{ pageNumber: 3, imageUrl: "https://example.com/image3.png" },
				{ pageNumber: 4, imageUrl: "https://example.com/image4.png" },
				{ pageNumber: 5, imageUrl: "https://example.com/image5.png" },
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(transcribeImagesBatch).mockResolvedValue({
				success: true,
				message: "バッチOCR処理完了: 5/5ページ処理成功",
				extractedPages: [],
				processedCount: 5,
				skippedCount: 0,
			});

			const request = createMockRequest({
				pages: mockPages,
				batchSize: 2,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(transcribeImagesBatch).toHaveBeenCalledWith(mockPages, 2);
		});
	});

	// ========================================
	// TC-003: バリデーションエラー（pages未指定）
	// ========================================
	describe("TC-003: Validation error - missing pages", () => {
		it("should return 400 when pages is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("pages are required");
		});
	});

	// ========================================
	// TC-004: バリデーションエラー（空のpages）
	// ========================================
	describe("TC-004: Validation error - empty pages", () => {
		it("should return 400 when pages is empty array", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				pages: [],
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("pages must not be empty");
		});
	});

	// ========================================
	// TC-005: クォータ不足エラー
	// ========================================
	describe("TC-005: Quota exceeded error", () => {
		it("should return 429 when quota is exceeded", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(transcribeImagesBatch).mockResolvedValue({
				success: false,
				message: "クォータ不足のメッセージ",
				error: "Quota exceeded",
			});

			const request = createMockRequest({
				pages: [
					{ pageNumber: 1, imageUrl: "https://example.com/image1.png" },
				],
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200); // transcribeImagesBatchは成功フラグで返す
			expect(data.success).toBe(false);
			expect(data.error).toBe("Quota exceeded");
		});
	});

	// ========================================
	// TC-006: 画像取得失敗
	// ========================================
	describe("TC-006: Image fetch failure", () => {
		it("should handle image fetch failures gracefully", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(transcribeImagesBatch).mockResolvedValue({
				success: true,
				message: "バッチOCR処理完了: 0/1ページ処理成功",
				extractedPages: [],
				processedCount: 0,
				skippedCount: 1,
			});

			const request = createMockRequest({
				pages: [
					{ pageNumber: 1, imageUrl: "https://invalid-url.com/image.png" },
				],
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.skippedCount).toBe(1);
		});
	});

	// ========================================
	// TC-007: API呼び出しエラー
	// ========================================
	describe("TC-007: API call error", () => {
		it("should return 500 when API call fails", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(transcribeImagesBatch).mockRejectedValue(
				new Error("API call failed"),
			);

			const request = createMockRequest({
				pages: [
					{ pageNumber: 1, imageUrl: "https://example.com/image1.png" },
				],
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("API call failed");
		});
	});

	// ========================================
	// TC-008: 認証エラー
	// ========================================
	describe("TC-008: Authentication error", () => {
		it("should return 401 when user is not authenticated", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(null) as never,
			);

			const request = createMockRequest({
				pages: [
					{ pageNumber: 1, imageUrl: "https://example.com/image1.png" },
				],
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Authentication required");
		});
	});
});
