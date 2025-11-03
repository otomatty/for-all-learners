/**
 * Tests for generateRawCardsFromPageContent (Phase 1.1)
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/_actions/generateCardsFromPage.ts
 *
 * Dependencies (Mocks):
 *   ├─ app/_actions/ai/getUserAPIKey.ts (mocked)
 *   ├─ lib/gemini/client.ts (mocked)
 *   └─ lib/logger.ts (mocked)
 *
 * Related Files:
 *   ├─ Spec: ../generateCardsFromPage.spec.md
 *   └─ Implementation: ../generateCardsFromPage.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Json } from "@/types/database.types";

// Mock dependencies BEFORE imports
vi.mock("@/lib/llm/factory", () => ({
	createClientWithUserKey: vi.fn(),
}));

vi.mock("@/lib/llm/prompt-builder", () => ({
	buildPrompt: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
	},
}));

import { createClientWithUserKey } from "@/lib/llm/factory";
import { buildPrompt } from "@/lib/llm/prompt-builder";
import type { LLMClient } from "@/lib/llm/client";
// Import the function after mocks
import { generateRawCardsFromPageContent } from "../generateCardsFromPage";

/**
 * Mock LLMClient implementation
 */
class MockLLMClient implements LLMClient {
	async generate(prompt: string): Promise<string> {
		return `Mock response for: ${prompt}`;
	}

	async *generateStream(prompt: string): AsyncGenerator<string> {
		yield `Mock stream: ${prompt}`;
	}
}

// Helper: Create Tiptap JSON mock
function createMockTiptapContent(text: string): Json {
	return {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [{ type: "text", text }],
			},
		],
	};
}

describe("generateRawCardsFromPageContent", () => {
	const mockClient: LLMClient = new MockLLMClient();

	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock implementations
		vi.mocked(buildPrompt).mockImplementation((parts) => {
			return Array.isArray(parts) ? parts.join("\n\n") : "";
		});
		vi.mocked(createClientWithUserKey).mockResolvedValue(mockClient);
	});

	// ========================================
	// TC-001: 基本的なカード生成（Google Gemini）
	// ========================================
	describe("TC-001: Basic card generation with Google Gemini", () => {
		it("should generate cards from page content using Google provider", async () => {
			const mockPageContent = createMockTiptapContent(
				"React Hooks は関数コンポーネントで状態管理を行う機能です。",
			);

			const mockCards = [
				{
					front_content: "React Hooksとは?",
					back_content: "関数コンポーネントで状態管理を行う機能",
				},
			];

			const jsonString = JSON.stringify(mockCards, null, 2);
			vi.spyOn(mockClient, "generate").mockResolvedValue(
				`\`\`\`json\n${jsonString}\n\`\`\``,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "google",
			});

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result.error).toBeUndefined();
			expect(result.generatedRawCards).toHaveLength(1);
			expect(result.generatedRawCards[0]).toEqual(mockCards[0]);
		});

		it("should use default provider (google) when not specified", async () => {
			const mockPageContent = createMockTiptapContent("テストテキスト");
			const mockCards = [{ front_content: "Q1", back_content: "A1" }];

			const jsonString = JSON.stringify(mockCards, null, 2);
			vi.spyOn(mockClient, "generate").mockResolvedValue(
				`\`\`\`json\n${jsonString}\n\`\`\``,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result.error).toBeUndefined();
		});
	});

	// ========================================
	// TC-002: OpenAIプロバイダーを使用したカード生成
	// ========================================
	describe("TC-002: Card generation with OpenAI provider", () => {
		it("should call createClientWithUserKey with openai provider", async () => {
			const mockPageContent = createMockTiptapContent("OpenAI test text");
			const mockCards = [{ front_content: "Q", back_content: "A" }];

			const jsonString = JSON.stringify(mockCards, null, 2);
			vi.spyOn(mockClient, "generate").mockResolvedValue(
				`\`\`\`json\n${jsonString}\n\`\`\``,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "openai",
			});

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "openai",
				model: undefined,
			});
			expect(result.error).toBeUndefined();
			expect(result.generatedRawCards).toHaveLength(1);
		});
	});

	// ========================================
	// TC-003: Anthropicプロバイダーを使用したカード生成
	// ========================================
	describe("TC-003: Card generation with Anthropic provider", () => {
		it("should call createClientWithUserKey with anthropic provider", async () => {
			const mockPageContent = createMockTiptapContent("Anthropic test text");
			const mockCards = [{ front_content: "Q", back_content: "A" }];

			const jsonString = JSON.stringify(mockCards, null, 2);
			vi.spyOn(mockClient, "generate").mockResolvedValue(
				`\`\`\`json\n${jsonString}\n\`\`\``,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "anthropic",
			});

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "anthropic",
				model: undefined,
			});
			expect(result.error).toBeUndefined();
		});
	});

	// ========================================
	// TC-004: 空のページコンテンツエラーハンドリング
	// ========================================
	describe("TC-004: Empty page content error handling", () => {
		it("should return error when page content is null", async () => {
			const result = await generateRawCardsFromPageContent(null);

			expect(result.error).toBe(
				"ページに抽出可能なテキストコンテンツがありません。",
			);
			expect(result.generatedRawCards).toEqual([]);
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});

		it("should return error when Tiptap content has no text", async () => {
			const emptyContent: Json = {
				type: "doc",
				content: [],
			};

			const result = await generateRawCardsFromPageContent(emptyContent);

			expect(result.error).toBe(
				"ページに抽出可能なテキストコンテンツがありません。",
			);
			expect(result.generatedRawCards).toEqual([]);
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-005: ユーザーAPIキー優先
	// ========================================
	describe("TC-005: User API key priority", () => {
		it("should prioritize user-configured API key", async () => {
			const mockPageContent = createMockTiptapContent("Test text");
			const mockCards = [{ front_content: "Q", back_content: "A" }];

			const jsonString = JSON.stringify(mockCards, null, 2);
			vi.spyOn(mockClient, "generate").mockResolvedValue(
				`\`\`\`json\n${jsonString}\n\`\`\``,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "google",
			});

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result.error).toBeUndefined();
		});
	});

	// ========================================
	// TC-006: APIキー未設定エラー
	// ========================================
	describe("TC-006: API key not configured error", () => {
		it("should return error when API key is not configured", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.mocked(createClientWithUserKey).mockRejectedValue(
				new Error(
					"API key not configured for provider: openai. Please set it in Settings.",
				),
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "openai",
			});

			expect(result.error).toContain("AIによるカード生成に失敗しました");
			expect(result.error).toContain(
				"API key not configured for provider: openai. Please set it in Settings.",
			);
			expect(result.generatedRawCards).toEqual([]);
		});
	});

	// ========================================
	// TC-007: 不正なプロバイダーエラー
	// ========================================
	describe("TC-007: Invalid provider error", () => {
		it("should return error for invalid provider", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.mocked(createClientWithUserKey).mockRejectedValue(
				new Error("Invalid provider: invalid_provider"),
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				// biome-ignore lint/suspicious/noExplicitAny: Testing invalid provider
				provider: "invalid_provider" as any,
			});

			expect(result.error).toContain("AIによるカード生成に失敗しました");
			expect(result.error).toContain("Invalid provider: invalid_provider");
			expect(result.generatedRawCards).toEqual([]);
		});
	});

	// ========================================
	// TC-008: LLM API呼び出し失敗
	// ========================================
	describe("TC-008: LLM API call failure", () => {
		it("should handle API timeout error", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.spyOn(mockClient, "generate").mockRejectedValue(
				new Error("Request timeout"),
			);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(result.error).toContain("AIによるカード生成に失敗しました");
			expect(result.error).toContain("Request timeout");
			expect(result.generatedRawCards).toEqual([]);
		});

		it("should handle network error", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.spyOn(mockClient, "generate").mockRejectedValue(
				new Error("Network error"),
			);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(result.error).toContain("AIによるカード生成に失敗しました");
			expect(result.generatedRawCards).toEqual([]);
		});
	});

	// ========================================
	// TC-009: JSON解析失敗エラー
	// ========================================
	describe("TC-009: JSON parsing failure", () => {
		it("should handle invalid JSON response", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.spyOn(mockClient, "generate").mockResolvedValue(
				"これは正しいJSONではありません { invalid }",
			);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(result.error).toContain("AIによるカード生成に失敗しました");
			expect(result.generatedRawCards).toEqual([]);
		});
	});

	// ========================================
	// TC-010: コードフェンス抽出（JSON）
	// ========================================
	describe("TC-010: Code fence JSON extraction", () => {
		it("should extract JSON from code fence", async () => {
			const mockPageContent = createMockTiptapContent("Test text");
			const mockCards = [
				{
					front_content: "React Hooksとは?",
					back_content: "関数コンポーネントで状態管理を行う機能",
				},
			];

			const jsonString = JSON.stringify(mockCards, null, 2);
			vi.spyOn(mockClient, "generate").mockResolvedValue(
				`\`\`\`json\n${jsonString}\n\`\`\``,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(result.error).toBeUndefined();
			expect(result.generatedRawCards).toHaveLength(1);
			expect(result.generatedRawCards[0]).toEqual(mockCards[0]);
		});
	});

	// ========================================
	// TC-011: JSON配列抽出（フォールバック）
	// ========================================
	describe("TC-011: JSON array fallback extraction", () => {
		it("should extract JSON array without code fence", async () => {
			const mockPageContent = createMockTiptapContent("Test text");
			const mockCards = [{ front_content: "質問1", back_content: "回答1" }];

			const responseText = `以下のようなカードを生成しました:\n${JSON.stringify(mockCards)}\nよろしくお願いします。`;
			vi.spyOn(mockClient, "generate").mockResolvedValue(responseText);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(result.error).toBeUndefined();
			expect(result.generatedRawCards).toHaveLength(1);
			expect(result.generatedRawCards[0]).toEqual(mockCards[0]);
		});
	});

	// ========================================
	// TC-012: 空の候補エラー
	// ========================================
	describe("TC-012: Empty candidates error", () => {
		it("should handle empty response", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.spyOn(mockClient, "generate").mockResolvedValue("");

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(result.error).toContain("AIによるカード生成に失敗しました");
			expect(result.error).toContain("AIからの応答が空です");
			expect(result.generatedRawCards).toEqual([]);
		});
	});

	// ========================================
	// TC-013: カード0件生成エラー
	// ========================================
	describe("TC-013: Zero cards generated error", () => {
		it("should return error when LLM returns empty array", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.spyOn(mockClient, "generate").mockResolvedValue("```json\n[]\n```");

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(result.error).toBe("AIによってカードが生成されませんでした。");
			expect(result.generatedRawCards).toEqual([]);
		});
	});

	// ========================================
	// TC-014: カスタムモデル指定
	// ========================================
	describe("TC-014: Custom model specification", () => {
		it("should use custom model when specified", async () => {
			const mockPageContent = createMockTiptapContent("Test text");
			const mockCards = [{ front_content: "Q", back_content: "A" }];

			const jsonString = JSON.stringify(mockCards, null, 2);
			vi.spyOn(mockClient, "generate").mockResolvedValue(
				`\`\`\`json\n${jsonString}\n\`\`\``,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "google",
				model: "gemini-2.0-pro",
			});

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: "gemini-2.0-pro",
			});
			expect(result.error).toBeUndefined();
		});

		it("should use default model when not specified", async () => {
			const mockPageContent = createMockTiptapContent("Test text");
			const mockCards = [{ front_content: "Q", back_content: "A" }];

			const jsonString = JSON.stringify(mockCards, null, 2);
			vi.spyOn(mockClient, "generate").mockResolvedValue(
				`\`\`\`json\n${jsonString}\n\`\`\``,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result.error).toBeUndefined();
		});
	});

	// ========================================
	// TC-015: Tiptapテキスト抽出（複雑な構造）
	// ========================================
	describe("TC-015: Complex Tiptap text extraction", () => {
		it("should extract text from multi-paragraph content", async () => {
			const complexContent: Json = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "段落1" }],
					},
					{
						type: "paragraph",
						content: [{ type: "text", text: "段落2" }],
					},
					{
						type: "heading",
						content: [{ type: "text", text: "見出し" }],
					},
				],
			};

			const mockCards = [{ front_content: "Q", back_content: "A" }];

			const jsonString = JSON.stringify(mockCards, null, 2);
			vi.spyOn(mockClient, "generate").mockResolvedValue(
				`\`\`\`json\n${jsonString}\n\`\`\``,
			);

			const result = await generateRawCardsFromPageContent(complexContent);

			expect(result.error).toBeUndefined();
			expect(result.generatedRawCards).toHaveLength(1);
		});
	});
});
