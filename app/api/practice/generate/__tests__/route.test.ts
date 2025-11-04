/**
 * Tests for Practice Question Generation API Route (Phase 1.3)
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/practice/generate/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ lib/gemini.ts (generateQuestions - mocked)
 *   ├─ lib/gemini/client.ts (geminiClient - mocked early)
 *   ├─ lib/supabase/server.ts (createClient - mocked)
 *   └─ lib/logger.ts (logger - mocked)
 *
 * Related Files:
 *   ├─ Spec: ../route.spec.md
 *   └─ Implementation: ../route.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock geminiClient BEFORE importing anything else
vi.mock("@/lib/gemini/client", () => ({
	geminiClient: {
		models: {
			generateContent: vi.fn(),
		},
	},
}));

// Mock other dependencies
vi.mock("@/lib/gemini");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import type { NextRequest } from "next/server";
import { generateQuestions } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { POST } from "../route";

// Helper: Create mock NextRequest
function createMockRequest(body: unknown): NextRequest {
	return {
		json: async () => body,
	} as NextRequest;
}

// Helper: Create mock Supabase client
function createMockSupabaseClient(cards: unknown[], error: unknown = null) {
	return {
		from: () => ({
			select: () => ({
				in: () => Promise.resolve({ data: error ? null : cards, error }),
			}),
		}),
	};
}

describe("POST /api/practice/generate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================
	// TC-001: 基本的な問題生成（デフォルトプロバイダー）
	// ========================================
	describe("TC-001: Basic question generation with default provider", () => {
		it("should generate questions using default provider (google)", async () => {
			const mockCards = [
				{ id: "card-1", front_content: "Front 1", back_content: "Back 1" },
				{ id: "card-2", front_content: "Front 2", back_content: "Back 2" },
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(mockCards) as never,
			);

			vi.mocked(generateQuestions).mockResolvedValue({
				type: "flashcard",
				question: "What is this?",
				answer: "Answer",
			} as never);

			const request = createMockRequest({
				cardIds: ["card-1", "card-2"],
				type: "flashcard",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.questions).toHaveLength(2);
			expect(generateQuestions).toHaveBeenCalledTimes(2);
			expect(generateQuestions).toHaveBeenCalledWith(
				"Front 1",
				"Back 1",
				"flashcard",
				"normal",
				undefined, // No provider specified
			);
		});
	});

	// ========================================
	// TC-002: Googleプロバイダー指定
	// ========================================
	describe("TC-002: Google provider specification", () => {
		it("should call generateQuestions with google provider", async () => {
			const mockCards = [
				{ id: "card-1", front_content: "Front", back_content: "Back" },
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(mockCards) as never,
			);

			vi.mocked(generateQuestions).mockResolvedValue({
				type: "flashcard",
				question: "Q",
				answer: "A",
			} as never);

			const request = createMockRequest({
				cardIds: ["card-1"],
				type: "flashcard",
				provider: "google",
			});

			const response = await POST(request);

			expect(response.status).toBe(200);
			expect(generateQuestions).toHaveBeenCalledWith(
				"Front",
				"Back",
				"flashcard",
				"normal",
				{ provider: "google", model: undefined },
			);
		});
	});

	// ========================================
	// TC-003: OpenAIプロバイダー指定
	// ========================================
	describe("TC-003: OpenAI provider specification", () => {
		it("should call generateQuestions with openai provider", async () => {
			const mockCards = [
				{ id: "card-1", front_content: "Front", back_content: "Back" },
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(mockCards) as never,
			);

			vi.mocked(generateQuestions).mockResolvedValue({
				type: "multiple_choice",
				prompt: "Prompt",
				question: "Q",
				options: ["A", "B", "C", "D"],
				correctAnswerIndex: 0,
				explanation: "Explanation",
			} as never);

			const request = createMockRequest({
				cardIds: ["card-1"],
				type: "multiple_choice",
				provider: "openai",
			});

			const response = await POST(request);

			expect(response.status).toBe(200);
			expect(generateQuestions).toHaveBeenCalledWith(
				"Front",
				"Back",
				"multiple_choice",
				"normal",
				{ provider: "openai", model: undefined },
			);
		});
	});

	// ========================================
	// TC-004: Anthropicプロバイダー指定
	// ========================================
	describe("TC-004: Anthropic provider specification", () => {
		it("should call generateQuestions with anthropic provider", async () => {
			const mockCards = [
				{ id: "card-1", front_content: "Front", back_content: "Back" },
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(mockCards) as never,
			);

			vi.mocked(generateQuestions).mockResolvedValue({
				type: "cloze",
				text: "Text with {blank1}",
				blanks: ["{blank1}"],
				question: "Q",
				answers: ["answer"],
				options: [["answer", "wrong1", "wrong2", "wrong3"]],
			} as never);

			const request = createMockRequest({
				cardIds: ["card-1"],
				type: "cloze",
				provider: "anthropic",
			});

			const response = await POST(request);

			expect(response.status).toBe(200);
			expect(generateQuestions).toHaveBeenCalledWith(
				"Front",
				"Back",
				"cloze",
				"normal",
				{ provider: "anthropic", model: undefined },
			);
		});
	});

	// ========================================
	// TC-005: カスタムモデル指定
	// ========================================
	describe("TC-005: Custom model specification", () => {
		it("should pass model parameter to generateQuestions", async () => {
			const mockCards = [
				{ id: "card-1", front_content: "Front", back_content: "Back" },
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(mockCards) as never,
			);

			vi.mocked(generateQuestions).mockResolvedValue({
				type: "flashcard",
				question: "Q",
				answer: "A",
			} as never);

			const request = createMockRequest({
				cardIds: ["card-1"],
				type: "flashcard",
				provider: "openai",
				model: "gpt-4",
			});

			const response = await POST(request);

			expect(response.status).toBe(200);
			expect(generateQuestions).toHaveBeenCalledWith(
				"Front",
				"Back",
				"flashcard",
				"normal",
				{ provider: "openai", model: "gpt-4" },
			);
		});
	});

	// ========================================
	// TC-006: バリデーションエラー（cardIds未指定）
	// ========================================
	describe("TC-006: Validation error - missing cardIds", () => {
		it("should return 400 when cardIds is missing", async () => {
			const request = createMockRequest({
				type: "flashcard",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("cardIds and type are required");
		});
	});

	// ========================================
	// TC-007: バリデーションエラー（type未指定）
	// ========================================
	describe("TC-007: Validation error - missing type", () => {
		it("should return 400 when type is missing", async () => {
			const request = createMockRequest({
				cardIds: ["card-1"],
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("cardIds and type are required");
		});
	});

	// ========================================
	// TC-008: バリデーションエラー（空のcardIds）
	// ========================================
	describe("TC-008: Validation error - empty cardIds", () => {
		it("should return 400 when cardIds is empty array", async () => {
			const request = createMockRequest({
				cardIds: [],
				type: "flashcard",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("cardIds must not be empty");
		});
	});

	// ========================================
	// TC-009: バリデーションエラー（不正なprovider）
	// ========================================
	describe("TC-009: Validation error - invalid provider", () => {
		it("should return 400 when provider is invalid", async () => {
			const request = createMockRequest({
				cardIds: ["card-1"],
				type: "flashcard",
				provider: "invalid-provider",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe(
				"Invalid provider. Must be one of: google, openai, anthropic",
			);
		});
	});

	// ========================================
	// TC-010: APIキー未設定エラー
	// ========================================
	describe("TC-010: API key not configured error", () => {
		it("should return 500 when generateQuestions throws API key error", async () => {
			const mockCards = [
				{ id: "card-1", front_content: "Front", back_content: "Back" },
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(mockCards) as never,
			);

			vi.mocked(generateQuestions).mockRejectedValue(
				new Error(
					"API key not configured for provider: openai. Please set it in Settings.",
				),
			);

			const request = createMockRequest({
				cardIds: ["card-1"],
				type: "flashcard",
				provider: "openai",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe(
				"API key not configured for provider: openai. Please set it in Settings.",
			);
		});
	});

	// ========================================
	// TC-011: データベースエラー
	// ========================================
	describe("TC-011: Database error", () => {
		it("should return 500 when Supabase returns error", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient([], {
					message: "Database connection failed",
				}) as never,
			);

			const request = createMockRequest({
				cardIds: ["non-existent-id"],
				type: "flashcard",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("Database connection failed");
		});
	});

	// ========================================
	// TC-012: LLM API呼び出しエラー
	// ========================================
	describe("TC-012: LLM API call error", () => {
		it("should return 500 when generateQuestions throws error", async () => {
			const mockCards = [
				{ id: "card-1", front_content: "Front", back_content: "Back" },
			];

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(mockCards) as never,
			);

			vi.mocked(generateQuestions).mockRejectedValue(
				new Error("LLM API timeout"),
			);

			const request = createMockRequest({
				cardIds: ["card-1"],
				type: "flashcard",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("LLM API timeout");
		});
	});
});
