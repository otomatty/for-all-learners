/**
 * Tests for Generate Cards API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/ai/generate-cards/route.ts
 *
 * Dependencies (Mocks):
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

describe("POST /api/ai/generate-cards", () => {
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
	// TC-001: 基本的なカード生成（デフォルトプロバイダー）
	// ========================================
	describe("TC-001: Basic card generation with default provider", () => {
		it("should generate cards successfully", async () => {
			const mockCards = [
				{
					front_content: "What is React?",
					back_content: "A JavaScript library",
				},
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(mockLLMClient.generate).mockResolvedValue(
				JSON.stringify(mockCards),
			);

			const request = createMockRequest({
				transcript: "React is a JavaScript library",
				sourceAudioUrl: "https://example.com/audio.mp3",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.cards).toHaveLength(1);
			expect(data.cards[0].front_content).toBe("What is React?");
			expect(data.cards[0].back_content).toBe("A JavaScript library");
			expect(data.cards[0].source_audio_url).toBe(
				"https://example.com/audio.mp3",
			);
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
		it("should generate cards with specified provider", async () => {
			const mockCards = [
				{
					front_content: "Question",
					back_content: "Answer",
				},
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(mockLLMClient.generate).mockResolvedValue(
				JSON.stringify(mockCards),
			);

			const request = createMockRequest({
				transcript: "Transcript text",
				sourceAudioUrl: "https://example.com/audio.mp3",
				provider: "openai",
				model: "gpt-4",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.cards).toHaveLength(1);
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
				transcript: "Transcript text",
				sourceAudioUrl: "https://example.com/audio.mp3",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("認証が必要です");
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-004: バリデーションエラー（transcript未指定）
	// ========================================
	describe("TC-004: Validation error - missing transcript", () => {
		it("should return 400 when transcript is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				sourceAudioUrl: "https://example.com/audio.mp3",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("transcriptは必須です");
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-005: バリデーションエラー（transcriptが空）
	// ========================================
	describe("TC-005: Validation error - empty transcript", () => {
		it("should return 400 when transcript is empty", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				transcript: "",
				sourceAudioUrl: "https://example.com/audio.mp3",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("transcriptが空です");
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-006: バリデーションエラー（sourceAudioUrl未指定）
	// ========================================
	describe("TC-006: Validation error - missing sourceAudioUrl", () => {
		it("should return 400 when sourceAudioUrl is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				transcript: "Transcript text",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("sourceAudioUrlは必須です");
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-007: バリデーションエラー（不正なprovider）
	// ========================================
	describe("TC-007: Validation error - invalid provider", () => {
		it("should return 400 when provider is invalid", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				transcript: "Transcript text",
				sourceAudioUrl: "https://example.com/audio.mp3",
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
	// TC-008: APIキー未設定エラー
	// ========================================
	describe("TC-008: API key not configured error", () => {
		it("should return 400 when API key is not configured", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(createClientWithUserKey).mockRejectedValue(
				new Error("API key not configured"),
			);

			const request = createMockRequest({
				transcript: "Transcript text",
				sourceAudioUrl: "https://example.com/audio.mp3",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("APIキーが設定されていません");
		});
	});

	// ========================================
	// TC-009: カード生成エラー
	// ========================================
	describe("TC-009: Card generation error", () => {
		it("should return 500 when card generation fails", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(mockLLMClient.generate).mockRejectedValue(
				new Error("カード生成に失敗しました"),
			);

			const request = createMockRequest({
				transcript: "Transcript text",
				sourceAudioUrl: "https://example.com/audio.mp3",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toContain("カード生成に失敗しました");
		});
	});
});
