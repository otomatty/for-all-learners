/**
 * Tests for generateQuestions and generateBulkQuestions (Phase 1.2)
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ lib/gemini.ts
 *
 * Dependencies (Mocks):
 *   ├─ lib/llm/factory.ts (mocked - createClientWithUserKey)
 *   └─ lib/logger.ts (mocked)
 *
 * Related Files:
 *   ├─ Spec: ../gemini.spec.md
 *   └─ Implementation: ../gemini.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMClient } from "@/lib/llm/client";

// Mock createClientWithUserKey and LLMClient
vi.mock("@/lib/llm/factory", () => ({
	createClientWithUserKey: vi.fn(),
}));

// Import other mocked modules
vi.mock("@/lib/logger");

import { createClientWithUserKey } from "@/lib/llm/factory";
// Import the function after mocks
import { generateBulkQuestions, generateQuestions } from "../gemini";

// Global mock generate function
let mockGenerate: ReturnType<typeof vi.fn>;

describe("generateQuestions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Setup mock client for each test
		mockGenerate = vi.fn();
		const mockClient: LLMClient = {
			generate: mockGenerate as (
				prompt: string,
				options?: unknown,
			) => Promise<string>,
			generateStream: vi.fn(async function* () {
				yield "";
			}) as (prompt: string, options?: unknown) => AsyncGenerator<string>,
		};
		vi.mocked(createClientWithUserKey).mockResolvedValue(mockClient);
	});

	// ========================================
	// TC-001: 基本的な問題生成（Google Gemini）
	// ========================================
	describe("TC-001: Basic question generation with Google Gemini", () => {
		it("should generate flashcard question using Google provider", async () => {
			const mockFront = "React Hooks";
			const mockBack = "関数コンポーネントで状態管理を行う機能";

			const mockResponse = JSON.stringify({
				question: "What is React Hooks?",
				answer: "Function to manage state in function components",
			});

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(
				mockFront,
				mockBack,
				"flashcard",
				"normal",
				{
					provider: "google",
				},
			);

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(mockGenerate).toHaveBeenCalledWith(
				expect.stringContaining(mockFront),
			);
			expect(result.type).toBe("flashcard");
			expect(result).toHaveProperty("question");
			expect(result).toHaveProperty("answer");
		});

		it("should use default provider (google) when not specified", async () => {
			const mockFront = "Test";
			const mockBack = "Test answer";

			const mockResponse = JSON.stringify({
				question: "Q",
				answer: "A",
			});

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(mockFront, mockBack, "flashcard");

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result.type).toBe("flashcard");
		});
	});

	// ========================================
	// TC-002: Multiple Choice問題生成
	// ========================================
	describe("TC-002: Multiple choice question generation", () => {
		it("should generate multiple choice question", async () => {
			const mockFront = "HTTP";
			const mockBack = "HyperText Transfer Protocol";

			const mockResponse = JSON.stringify({
				prompt: "What is HTTP?",
				question: "What does HTTP stand for?",
				options: [
					"Option A",
					"Option B",
					"Option C",
					"HyperText Transfer Protocol",
				],
				correctAnswerIndex: 3,
				explanation: "HTTP stands for **HyperText Transfer Protocol**.",
			});

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(
				mockFront,
				mockBack,
				"multiple_choice",
				"normal",
				{
					provider: "google",
				},
			);

			expect(result.type).toBe("multiple_choice");
			expect(result).toHaveProperty("options");
			expect(result).toHaveProperty("correctAnswerIndex");
			expect(result).toHaveProperty("explanation");
			if (result.type === "multiple_choice") {
				expect(result.options.length).toBe(4);
				expect(result.correctAnswerIndex).toBeGreaterThanOrEqual(0);
				expect(result.correctAnswerIndex).toBeLessThanOrEqual(3);
			}
		});
	});

	// ========================================
	// TC-003: Cloze問題生成
	// ========================================
	describe("TC-003: Cloze question generation", () => {
		it("should generate cloze question", async () => {
			const mockFront = "TypeScript";
			const mockBack = "型安全なJavaScriptスーパーセット";

			const mockResponse = JSON.stringify({
				text: "TypeScript is a {blank1} superset of JavaScript.",
				blanks: ["{blank1}"],
				question: "Fill in the blank",
				answers: ["type-safe"],
				options: [["type-safe", "dynamic", "weak", "untyped"]],
			});

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(
				mockFront,
				mockBack,
				"cloze",
				"normal",
				{
					provider: "google",
				},
			);

			expect(result.type).toBe("cloze");
			if (result.type === "cloze") {
				expect(Array.isArray(result.blanks)).toBe(true);
				expect(Array.isArray(result.answers)).toBe(true);
				expect(Array.isArray(result.options)).toBe(true);
			}
		});
	});

	// ========================================
	// TC-004: OpenAIプロバイダーを使用した問題生成
	// ========================================
	describe("TC-004: Question generation with OpenAI provider", () => {
		it("should use openai provider", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			const mockResponse = JSON.stringify({
				question: "Q",
				answer: "A",
			});

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(
				mockFront,
				mockBack,
				"flashcard",
				"normal",
				{
					provider: "openai",
				},
			);

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "openai",
				model: undefined,
			});
			expect(result.type).toBe("flashcard");
		});
	});

	// ========================================
	// TC-005: Anthropicプロバイダーを使用した問題生成
	// ========================================
	describe("TC-005: Question generation with Anthropic provider", () => {
		it("should use anthropic provider", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			const mockResponse = JSON.stringify({
				question: "Q",
				answer: "A",
			});

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(
				mockFront,
				mockBack,
				"flashcard",
				"normal",
				{
					provider: "anthropic",
				},
			);

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "anthropic",
				model: undefined,
			});
			expect(result.type).toBe("flashcard");
		});
	});

	// ========================================
	// TC-006: ユーザーAPIキー優先
	// ========================================
	describe("TC-006: User API key priority", () => {
		it("should prioritize user-configured API key", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			const mockResponse = JSON.stringify({
				question: "Q",
				answer: "A",
			});

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(
				mockFront,
				mockBack,
				"flashcard",
				"normal",
				{
					provider: "google",
				},
			);

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result.type).toBe("flashcard");
		});
	});

	// ========================================
	// TC-007: APIキー未設定エラー
	// ========================================
	describe("TC-007: API key not configured error", () => {
		it("should throw error when API key is not configured", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			// createClientWithUserKey will throw the error before creating a client
			vi.mocked(createClientWithUserKey).mockRejectedValue(
				new Error(
					"API key not configured for provider: openai. Please set it in Settings.",
				),
			);

			await expect(
				generateQuestions(mockFront, mockBack, "flashcard", "normal", {
					provider: "openai",
				}),
			).rejects.toThrow(
				"API key not configured for provider: openai. Please set it in Settings.",
			);
		});
	});

	// ========================================
	// TC-008: LLM API呼び出し失敗
	// ========================================
	describe("TC-008: LLM API call failure", () => {
		it("should throw error when API call fails", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			mockGenerate.mockRejectedValue(new Error("Request timeout"));

			await expect(
				generateQuestions(mockFront, mockBack, "flashcard"),
			).rejects.toThrow();
		});
	});

	// ========================================
	// TC-009: JSON解析失敗エラー
	// ========================================
	describe("TC-009: JSON parsing failure", () => {
		it("should throw error when JSON is invalid", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			mockGenerate.mockResolvedValue(
				"これは正しいJSONではありません { invalid }",
			);

			await expect(
				generateQuestions(mockFront, mockBack, "flashcard"),
			).rejects.toThrow("Failed to parse Gemini response JSON");
		});
	});

	// ========================================
	// TC-010: コードフェンス抽出（JSON）
	// ========================================
	describe("TC-010: Code fence JSON extraction", () => {
		it("should extract JSON from code fence", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			const mockQuestion = {
				question: "What is Test?",
				answer: "Test answer",
			};

			const mockResponse = `\`\`\`json\n${JSON.stringify(mockQuestion)}\n\`\`\``;

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(mockFront, mockBack, "flashcard");

			expect(result.type).toBe("flashcard");
			if (result.type === "flashcard") {
				expect(result.question).toBe("What is Test?");
			}
		});
	});

	// ========================================
	// TC-011: JSONオブジェクト抽出（フォールバック）
	// ========================================
	describe("TC-011: JSON object fallback extraction", () => {
		it("should extract JSON object without code fence", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			const mockQuestion = { question: "Q1", answer: "A1" };
			const mockResponse = `以下のような問題を生成しました:\n${JSON.stringify(mockQuestion)}\nよろしくお願いします。`;

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(mockFront, mockBack, "flashcard");

			expect(result.type).toBe("flashcard");
			if (result.type === "flashcard") {
				expect(result.question).toBe("Q1");
			}
		});
	});

	// ========================================
	// TC-012: 空の応答エラー
	// ========================================
	describe("TC-012: Empty response error", () => {
		it("should throw error when response is empty", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			mockGenerate.mockResolvedValue("");

			await expect(
				generateQuestions(mockFront, mockBack, "flashcard"),
			).rejects.toThrow("Empty response from LLM client");
		});
	});

	// ========================================
	// TC-014: カスタムモデル指定
	// ========================================
	describe("TC-014: Custom model specification", () => {
		it("should use custom model when specified", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			const mockResponse = JSON.stringify({
				question: "Q",
				answer: "A",
			});

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(
				mockFront,
				mockBack,
				"flashcard",
				"normal",
				{
					provider: "google",
					model: "gemini-2.0-pro",
				},
			);

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: "gemini-2.0-pro",
			});
			expect(result.type).toBe("flashcard");
		});
	});

	// ========================================
	// TC-015: デフォルトモデル使用
	// ========================================
	describe("TC-015: Default model usage", () => {
		it("should use default model when not specified", async () => {
			const mockFront = "Test";
			const mockBack = "Test";

			const mockResponse = JSON.stringify({
				question: "Q",
				answer: "A",
			});

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateQuestions(mockFront, mockBack, "flashcard");

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result.type).toBe("flashcard");
		});
	});
});

// ========================================
// generateBulkQuestions Tests
// ========================================
describe("generateBulkQuestions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================
	// TC-013: バッチ生成（generateBulkQuestions）
	// ========================================
	describe("TC-013: Bulk question generation", () => {
		it("should generate multiple questions in batch", async () => {
			const mockPairs = [
				{ front: "A", back: "Answer A" },
				{ front: "B", back: "Answer B" },
			];

			const mockQuestions = [
				{ question: "What is A?", answer: "Answer A" },
				{ question: "What is B?", answer: "Answer B" },
			];

			const mockResponse = JSON.stringify(mockQuestions);

			mockGenerate.mockResolvedValue(mockResponse);

			const result = await generateBulkQuestions(mockPairs, "flashcard", "ja", {
				provider: "google",
			});

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBe(2);
			expect(result[0].type).toBe("flashcard");
		});

		it("should use default provider when not specified", async () => {
			const mockPairs = [{ front: "Test", back: "Test" }];
			const mockQuestions = [{ question: "Q", answer: "A" }];

			mockGenerate.mockResolvedValue(JSON.stringify(mockQuestions));

			const result = await generateBulkQuestions(mockPairs, "flashcard", "ja");

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result.length).toBe(1);
		});
	});
});
