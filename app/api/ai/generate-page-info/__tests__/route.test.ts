/**
 * Tests for Generate Page Info API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/ai/generate-page-info/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ app/_actions/generatePageInfo.ts (generatePageInfo - mocked)
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

describe("POST /api/ai/generate-page-info", () => {
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
	// TC-001: 基本的なページ情報生成
	// ========================================
	describe("TC-001: Basic page info generation", () => {
		it("should generate page info successfully", async () => {
			const mockMarkdown = "## React Hooks\n\nReact Hooksは...";

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(mockLLMClient.generate).mockResolvedValue(mockMarkdown);

			const request = createMockRequest({
				title: "React Hooks",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.markdown).toBe(mockMarkdown);
			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
		});
	});

	// ========================================
	// TC-002: プロバイダー指定
	// ========================================
	describe("TC-002: Provider specification", () => {
		it("should generate page info with specified provider", async () => {
			const mockMarkdown = "## Title\n\nContent";

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(mockLLMClient.generate).mockResolvedValue(mockMarkdown);

			const request = createMockRequest({
				title: "Title",
				provider: "openai",
				model: "gpt-4",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.markdown).toBe(mockMarkdown);
			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "openai",
				model: "gpt-4",
			});
		});
	});

	// ========================================
	// TC-003: 認証エラー
	// ========================================
	describe("TC-003: Authentication error", () => {
		it("should return 401 when user is not authenticated", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(false) as never,
			);

			const request = createMockRequest({
				title: "Title",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("認証が必要です");
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-004: バリデーションエラー（title未指定）
	// ========================================
	describe("TC-004: Validation error - missing title", () => {
		it("should return 400 when title is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("titleは必須です");
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-005: バリデーションエラー（titleが空）
	// ========================================
	describe("TC-005: Validation error - empty title", () => {
		it("should return 400 when title is empty", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				title: "",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("titleが空です");
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-006: バリデーションエラー（不正なprovider）
	// ========================================
	describe("TC-006: Validation error - invalid provider", () => {
		it("should return 400 when provider is invalid", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				title: "Title",
				provider: "invalid-provider",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("無効なproviderです");
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-007: APIキー未設定エラー
	// ========================================
	describe("TC-007: API key not configured error", () => {
		it("should return 400 when API key is not configured", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(createClientWithUserKey).mockRejectedValue(
				new Error("API key not configured"),
			);

			const request = createMockRequest({
				title: "Title",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("APIキーが設定されていません");
		});
	});

	// ========================================
	// TC-008: ページ情報生成エラー
	// ========================================
	describe("TC-008: Page info generation error", () => {
		it("should return 500 when page info generation fails", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(createClientWithUserKey).mockRejectedValue(
				new Error("生成に失敗しました"),
			);

			const request = createMockRequest({
				title: "Title",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("生成に失敗しました");
		});
	});
});
