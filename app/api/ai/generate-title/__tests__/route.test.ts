/**
 * Tests for Generate Title API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/ai/generate-title/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ lib/llm/factory.ts (createClientWithUserKey - mocked)
 *   ├─ lib/llm/prompt-builder.ts (buildPrompt - mocked)
 *   ├─ lib/supabase/server.ts (createClient - mocked)
 *   └─ lib/logger.ts (logger - mocked)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies BEFORE imports
vi.mock("@/lib/llm/factory");
vi.mock("@/lib/llm/prompt-builder");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import type { NextRequest } from "next/server";
import type { LLMClient } from "@/lib/llm/client";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { buildPrompt } from "@/lib/llm/prompt-builder";
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
	const mockLLMClient: LLMClient = {
		generate: vi.fn(),
		generateStream: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(buildPrompt).mockImplementation((parts) =>
			Array.isArray(parts) ? parts.join("\n\n") : "",
		);
		vi.mocked(createClientWithUserKey).mockResolvedValue(mockLLMClient);
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

			vi.mocked(mockLLMClient.generate).mockResolvedValue(mockTitle);

			const request = createMockRequest({
				transcript: "React Hooksについて説明します...",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.title).toBe(mockTitle);
			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
			});
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
			expect(createClientWithUserKey).not.toHaveBeenCalled();
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
			expect(createClientWithUserKey).not.toHaveBeenCalled();
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
			expect(createClientWithUserKey).not.toHaveBeenCalled();
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

			vi.mocked(createClientWithUserKey).mockRejectedValue(
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

			vi.mocked(mockLLMClient.generate).mockRejectedValue(
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
