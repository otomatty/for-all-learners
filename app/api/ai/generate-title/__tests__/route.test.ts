/**
 * Tests for Generate Title API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/ai/generate-title/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ app/_actions/generateTitle.ts (generateTitleFromTranscript - mocked)
 *   ├─ lib/supabase/server.ts (createClient - mocked)
 *   └─ lib/logger.ts (logger - mocked)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies BEFORE imports
vi.mock("@/app/_actions/generateTitle");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import type { NextRequest } from "next/server";
import { generateTitleFromTranscript } from "@/app/_actions/generateTitle";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

// Helper: Create mock NextRequest
function createMockRequest(body: unknown): NextRequest {
	return {
		json: async () => body,
	} as NextRequest;
}

// Helper: Create mock Supabase client with authenticated user
function createMockSupabaseClient(authenticated = true) {
	return {
		auth: {
			getUser: () =>
				Promise.resolve({
					data: {
						user: authenticated ? { id: "user-123" } : null,
					},
					error: authenticated ? null : new Error("Not authenticated"),
				}),
		},
	};
}

describe("POST /api/ai/generate-title", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================
	// TC-001: 基本的なタイトル生成
	// ========================================
	describe("TC-001: Basic title generation", () => {
		it("should generate title successfully", async () => {
			const mockTitle = "React Hooks入門";

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(generateTitleFromTranscript).mockResolvedValue(mockTitle);

			const request = createMockRequest({
				transcript: "React Hooksについて説明します...",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.title).toBe(mockTitle);
			expect(generateTitleFromTranscript).toHaveBeenCalledWith(
				"React Hooksについて説明します...",
			);
		});
	});

	// ========================================
	// TC-002: 認証エラー
	// ========================================
	describe("TC-002: Authentication error", () => {
		it("should return 401 when user is not authenticated", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(false) as never,
			);

			const request = createMockRequest({
				transcript: "Transcript text",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("認証が必要です");
			expect(generateTitleFromTranscript).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-003: バリデーションエラー（transcript未指定）
	// ========================================
	describe("TC-003: Validation error - missing transcript", () => {
		it("should return 400 when transcript is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("transcriptは必須です");
			expect(generateTitleFromTranscript).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-004: バリデーションエラー（transcriptが空）
	// ========================================
	describe("TC-004: Validation error - empty transcript", () => {
		it("should return 400 when transcript is empty", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				transcript: "",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("transcriptが空です");
			expect(generateTitleFromTranscript).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-005: APIキー未設定エラー
	// ========================================
	describe("TC-005: API key not configured error", () => {
		it("should return 400 when API key is not configured", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(generateTitleFromTranscript).mockRejectedValue(
				new Error("API key not configured"),
			);

			const request = createMockRequest({
				transcript: "Transcript text",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("APIキーが設定されていません");
		});
	});

	// ========================================
	// TC-006: タイトル生成エラー
	// ========================================
	describe("TC-006: Title generation error", () => {
		it("should return 500 when title generation fails", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(generateTitleFromTranscript).mockRejectedValue(
				new Error("タイトル生成に失敗しました"),
			);

			const request = createMockRequest({
				transcript: "Transcript text",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("タイトル生成に失敗しました");
		});
	});
});
