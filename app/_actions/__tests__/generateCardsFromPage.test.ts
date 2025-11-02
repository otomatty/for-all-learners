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

// Mock geminiClient before importing
vi.mock("@/lib/gemini/client", () => ({
	geminiClient: {
		models: {
			generateContent: vi.fn(),
		},
	},
}));

// Import other mocked modules
vi.mock("@/app/_actions/ai/getUserAPIKey");
vi.mock("@/lib/logger");

// Import the function after mocks
import { generateRawCardsFromPageContent } from "../generateCardsFromPage";
import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
import { geminiClient } from "@/lib/gemini/client";

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

// Helper: Create Gemini API response mock
function createMockGeminiResponse(
	cards: Array<{ front_content: string; back_content: string }>,
) {
	const jsonString = JSON.stringify(cards, null, 2);
	return {
		candidates: [
			{
				content: {
					parts: [{ text: `\`\`\`json\n${jsonString}\n\`\`\`` }],
				},
			},
		],
	};
}

describe("generateRawCardsFromPageContent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-google-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards) as never,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "google",
			});

			expect(getUserAPIKey).toHaveBeenCalledWith("google");
			expect(result.error).toBeUndefined();
			expect(result.generatedRawCards).toHaveLength(1);
			expect(result.generatedRawCards[0]).toEqual(mockCards[0]);
		});

		it("should use default provider (google) when not specified", async () => {
			const mockPageContent = createMockTiptapContent("テストテキスト");
			const mockCards = [{ front_content: "Q1", back_content: "A1" }];

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards) as never,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(getUserAPIKey).toHaveBeenCalledWith("google");
			expect(result.error).toBeUndefined();
		});
	});

	// ========================================
	// TC-002: OpenAIプロバイダーを使用したカード生成
	// ========================================
	describe("TC-002: Card generation with OpenAI provider", () => {
		it("should call getUserAPIKey with openai provider", async () => {
			const mockPageContent = createMockTiptapContent("OpenAI test text");
			const mockCards = [{ front_content: "Q", back_content: "A" }];

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-openai-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards) as never,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "openai",
			});

			expect(getUserAPIKey).toHaveBeenCalledWith("openai");
			expect(result.error).toBeUndefined();
			expect(result.generatedRawCards).toHaveLength(1);
		});
	});

	// ========================================
	// TC-003: Anthropicプロバイダーを使用したカード生成
	// ========================================
	describe("TC-003: Card generation with Anthropic provider", () => {
		it("should call getUserAPIKey with anthropic provider", async () => {
			const mockPageContent = createMockTiptapContent("Anthropic test text");
			const mockCards = [{ front_content: "Q", back_content: "A" }];

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-anthropic-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards) as never,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "anthropic",
			});

			expect(getUserAPIKey).toHaveBeenCalledWith("anthropic");
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
			expect(getUserAPIKey).not.toHaveBeenCalled();
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
			expect(getUserAPIKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-005: ユーザーAPIキー優先
	// ========================================
	describe("TC-005: User API key priority", () => {
		it("should prioritize user-configured API key", async () => {
			const mockPageContent = createMockTiptapContent("Test text");
			const mockCards = [{ front_content: "Q", back_content: "A" }];

			// getUserAPIKey は内部でユーザーキーを優先
			vi.mocked(getUserAPIKey).mockResolvedValue("user-custom-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards) as never,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "google",
			});

			expect(getUserAPIKey).toHaveBeenCalledWith("google");
			expect(result.error).toBeUndefined();
		});
	});

	// ========================================
	// TC-006: APIキー未設定エラー
	// ========================================
	describe("TC-006: API key not configured error", () => {
		it("should throw error when API key is not configured", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.mocked(getUserAPIKey).mockRejectedValue(
				new Error(
					"API key not configured for provider: openai. Please set it in Settings.",
				),
			);

			await expect(
				generateRawCardsFromPageContent(mockPageContent, {
					provider: "openai",
				}),
			).rejects.toThrow(
				"API key not configured for provider: openai. Please set it in Settings.",
			);
		});
	});

	// ========================================
	// TC-007: 不正なプロバイダーエラー
	// ========================================
	describe("TC-007: Invalid provider error", () => {
		it("should throw error for invalid provider", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.mocked(getUserAPIKey).mockRejectedValue(
				new Error("Invalid provider: invalid_provider"),
			);

			await expect(
				generateRawCardsFromPageContent(mockPageContent, {
					// biome-ignore lint/suspicious/noExplicitAny: Testing invalid provider
					provider: "invalid_provider" as any,
				}),
			).rejects.toThrow();
		});
	});

	// ========================================
	// TC-008: LLM API呼び出し失敗
	// ========================================
	describe("TC-008: LLM API call failure", () => {
		it("should handle API timeout error", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockRejectedValue(
				new Error("Request timeout"),
			);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(result.error).toContain("AIによるカード生成に失敗しました");
			expect(result.error).toContain("Request timeout");
			expect(result.generatedRawCards).toEqual([]);
		});

		it("should handle network error", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockRejectedValue(
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

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: "これは正しいJSONではありません { invalid }" }],
						},
					},
				],
				// biome-ignore lint/suspicious/noExplicitAny: Mock response
			} as any);

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

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards) as never,
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

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [
								{
									text: `以下のようなカードを生成しました:\n${JSON.stringify(mockCards)}\nよろしくお願いします。`,
								},
							],
						},
					},
				],
				// biome-ignore lint/suspicious/noExplicitAny: Mock response
			} as any);

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
		it("should handle empty candidates response", async () => {
			const mockPageContent = createMockTiptapContent("Test text");

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [],
				// biome-ignore lint/suspicious/noExplicitAny: Mock response
			} as any);

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

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: "```json\n[]\n```" }],
						},
					},
				],
				// biome-ignore lint/suspicious/noExplicitAny: Mock response
			} as any);

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

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards) as never,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent, {
				provider: "google",
				model: "gemini-2.0-pro",
			});

			expect(geminiClient.models.generateContent).toHaveBeenCalledWith(
				expect.objectContaining({
					model: "gemini-2.0-pro",
				}),
			);
			expect(result.error).toBeUndefined();
		});

		it("should use default model when not specified", async () => {
			const mockPageContent = createMockTiptapContent("Test text");
			const mockCards = [{ front_content: "Q", back_content: "A" }];

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards) as never,
			);

			const result = await generateRawCardsFromPageContent(mockPageContent);

			expect(geminiClient.models.generateContent).toHaveBeenCalledWith(
				expect.objectContaining({
					model: "gemini-2.5-flash",
				}),
			);
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

			vi.mocked(getUserAPIKey).mockResolvedValue("mock-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards) as never,
			);

			const result = await generateRawCardsFromPageContent(complexContent);

			expect(result.error).toBeUndefined();
			expect(result.generatedRawCards).toHaveLength(1);
		});
	});
});
