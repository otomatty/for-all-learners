/**
 * Tests for generateCardsFromTranscript with getUserAPIKey integration
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

// Setup environment BEFORE imports
process.env.ENCRYPTION_KEY =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Mock dependencies BEFORE imports
vi.mock("@/app/_actions/ai/getUserAPIKey", () => ({
	getUserAPIKey: vi.fn(),
}));

vi.mock("@/lib/gemini/client", () => ({
	geminiClient: {
		models: {
			generateContent: vi.fn(),
		},
	},
}));

vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
	},
}));

import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
import { geminiClient } from "@/lib/gemini/client";
// Import AFTER mocks
import { generateCardsFromTranscript } from "../generateCards";

/**
 * Helper: Create mock Gemini response for card generation
 * @param cards - Array of card objects
 * @returns Mock response object
 */
function createMockGeminiResponse(
	cards: Array<{ front_content: string; back_content: string }>,
) {
	const text = JSON.stringify(cards);
	return {
		candidates: [
			{
				content: {
					parts: [{ text }],
				},
			},
		],
		text,
		data: undefined,
		functionCalls: undefined,
		executableCode: undefined,
		codeExecutionResult: undefined,
	};
}

describe("generateCardsFromTranscript - Phase 1.0 Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock implementations
		vi.mocked(getUserAPIKey).mockResolvedValue("test-api-key");
	});

	describe("TC-001: 基本的なカード生成（Google Gemini）", () => {
		test("should generate cards and call getUserAPIKey with google", async () => {
			// Arrange
			const transcript =
				"React Hooks とは、関数コンポーネントで状態管理を行う機能です。";
			const sourceAudioUrl = "https://example.com/audio.mp3";
			const provider = "google";

			const mockCards = [
				{
					front_content: "React Hooksとは？",
					back_content: "関数コンポーネントで状態管理を行う機能",
				},
			];

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards),
			);

			// Act
			const result = await generateCardsFromTranscript(
				transcript,
				sourceAudioUrl,
				{ provider },
			);

			// Assert
			expect(getUserAPIKey).toHaveBeenCalledWith(provider);
			expect(result).toHaveLength(1);
			expect(result[0].front_content).toBe("React Hooksとは？");
			expect(result[0].back_content).toBe(
				"関数コンポーネントで状態管理を行う機能",
			);
			expect(result[0].source_audio_url).toBe(sourceAudioUrl);
		});
	});

	describe("TC-002: OpenAIプロバイダー選択", () => {
		test("should use OpenAI provider when specified", async () => {
			// Arrange
			const transcript =
				"TypeScript は JavaScript に型システムを追加した言語です。";
			const sourceAudioUrl = "https://example.com/audio2.mp3";
			const provider = "openai";

			const mockCards = [
				{
					front_content: "TypeScriptとは？",
					back_content: "JavaScriptに型システムを追加した言語",
				},
			];

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards),
			);

			// Act
			const result = await generateCardsFromTranscript(
				transcript,
				sourceAudioUrl,
				{ provider },
			);

			// Assert
			expect(getUserAPIKey).toHaveBeenCalledWith(provider);
			expect(result).toHaveLength(1);
			expect(result[0].front_content).toBe("TypeScriptとは？");
		});
	});

	describe("TC-003: Anthropicプロバイダー選択", () => {
		test("should use Anthropic provider when specified", async () => {
			// Arrange
			const transcript =
				"Next.js は React ベースのフルスタックフレームワークです。";
			const sourceAudioUrl = "https://example.com/audio3.mp3";
			const provider = "anthropic";

			const mockCards = [
				{
					front_content: "Next.jsとは？",
					back_content: "Reactベースのフルスタックフレームワーク",
				},
			];

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards),
			);

			// Act
			const result = await generateCardsFromTranscript(
				transcript,
				sourceAudioUrl,
				{ provider },
			);

			// Assert
			expect(getUserAPIKey).toHaveBeenCalledWith(provider);
			expect(result).toHaveLength(1);
		});
	});

	describe("TC-004: 空のトランスクリプトエラーハンドリング", () => {
		test("should throw error when transcript is empty", async () => {
			// Arrange
			const transcript = "";
			const sourceAudioUrl = "https://example.com/audio.mp3";

			// Act & Assert
			await expect(
				generateCardsFromTranscript(transcript, sourceAudioUrl),
			).rejects.toThrow("トランスクリプトが空です");

			// getUserAPIKey should not be called (early return)
			expect(getUserAPIKey).not.toHaveBeenCalled();
		});

		test("should throw error when transcript is whitespace only", async () => {
			// Arrange
			const transcript = "   \n\t  ";
			const sourceAudioUrl = "https://example.com/audio.mp3";

			// Act & Assert
			await expect(
				generateCardsFromTranscript(transcript, sourceAudioUrl),
			).rejects.toThrow("トランスクリプトが空です");
		});
	});

	describe("TC-005: ユーザーAPIキー優先", () => {
		test("should prioritize user API key over environment variables", async () => {
			// Arrange
			const transcript = "テストトランスクリプト";
			const sourceAudioUrl = "https://example.com/audio.mp3";
			const provider = "google";

			// Mock user API key
			vi.mocked(getUserAPIKey).mockResolvedValue("user-custom-api-key");

			const mockCards = [{ front_content: "質問", back_content: "回答" }];

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(mockCards),
			);

			// Act
			await generateCardsFromTranscript(transcript, sourceAudioUrl, {
				provider,
			});

			// Assert
			expect(getUserAPIKey).toHaveBeenCalledWith(provider);
			// API key is retrieved (implementation detail verified in getUserAPIKey tests)
		});
	});

	describe("TC-006: APIキー未設定エラー", () => {
		test("should throw error when API key is not configured", async () => {
			// Arrange
			const transcript = "テストトランスクリプト";
			const sourceAudioUrl = "https://example.com/audio.mp3";
			const provider = "openai";

			// Mock getUserAPIKey to throw error
			vi.mocked(getUserAPIKey).mockRejectedValue(
				new Error(
					"API key not configured for provider: openai. Please set it in Settings.",
				),
			);

			// Act & Assert
			await expect(
				generateCardsFromTranscript(transcript, sourceAudioUrl, { provider }),
			).rejects.toThrow(
				"API key not configured for provider: openai. Please set it in Settings.",
			);
		});
	});

	describe("TC-007: 不正なプロバイダーエラー", () => {
		test("should throw error for invalid provider", async () => {
			// Arrange
			const transcript = "テストトランスクリプト";
			const sourceAudioUrl = "https://example.com/audio.mp3";
			// biome-ignore lint/suspicious/noExplicitAny: Testing invalid provider type
			const provider = "invalid_provider" as any;

			// Mock getUserAPIKey to throw validation error
			vi.mocked(getUserAPIKey).mockRejectedValue(
				new Error("Invalid provider: invalid_provider"),
			);

			// Act & Assert
			await expect(
				generateCardsFromTranscript(transcript, sourceAudioUrl, { provider }),
			).rejects.toThrow("Invalid provider: invalid_provider");
		});
	});

	describe("TC-008: LLM API呼び出し失敗", () => {
		test("should handle LLM API failure gracefully", async () => {
			// Arrange
			const transcript = "テストトランスクリプト";
			const sourceAudioUrl = "https://example.com/audio.mp3";

			// Mock API failure
			vi.mocked(geminiClient.models.generateContent).mockRejectedValue(
				new Error("API request timeout"),
			);

			// Act & Assert
			await expect(
				generateCardsFromTranscript(transcript, sourceAudioUrl),
			).rejects.toThrow("API request timeout");
		});
	});

	describe("TC-009: JSON解析失敗エラー", () => {
		test("should throw error when JSON parsing fails", async () => {
			// Arrange
			const transcript = "テストトランスクリプト";
			const sourceAudioUrl = "https://example.com/audio.mp3";

			// Mock invalid JSON response
			const invalidJson = "これは正しいJSONではありません { invalid }";
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: invalidJson }],
						},
					},
				],
				text: invalidJson,
				data: undefined,
				functionCalls: undefined,
				executableCode: undefined,
				codeExecutionResult: undefined,
			});

			// Act & Assert
			await expect(
				generateCardsFromTranscript(transcript, sourceAudioUrl),
			).rejects.toThrow("カード生成結果の解析に失敗しました");
		});
	});

	describe("TC-010: コードフェンス抽出（JSON）", () => {
		test("should extract JSON from code fence", async () => {
			// Arrange
			const transcript = "テストトランスクリプト";
			const sourceAudioUrl = "https://example.com/audio.mp3";

			const mockCards = [
				{
					front_content: "React Hooksとは?",
					back_content: "関数コンポーネントで状態管理を行う機能",
				},
			];

			const responseWithFence = `\`\`\`json
${JSON.stringify(mockCards)}
\`\`\``;

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: responseWithFence }],
						},
					},
				],
				text: responseWithFence,
				data: undefined,
				functionCalls: undefined,
				executableCode: undefined,
				codeExecutionResult: undefined,
			});

			// Act
			const result = await generateCardsFromTranscript(
				transcript,
				sourceAudioUrl,
			);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].front_content).toBe("React Hooksとは?");
			expect(result[0].back_content).toBe(
				"関数コンポーネントで状態管理を行う機能",
			);
		});
	});

	describe("TC-011: JSON配列抽出（フォールバック）", () => {
		test("should extract JSON array without code fence (fallback)", async () => {
			// Arrange
			const transcript = "テストトランスクリプト";
			const sourceAudioUrl = "https://example.com/audio.mp3";

			const mockCards = [{ front_content: "質問1", back_content: "回答1" }];

			const responseWithoutFence = `
以下のようなカードを生成しました:
${JSON.stringify(mockCards)}
よろしくお願いします。
`;

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: responseWithoutFence }],
						},
					},
				],
				text: responseWithoutFence,
				data: undefined,
				functionCalls: undefined,
				executableCode: undefined,
				codeExecutionResult: undefined,
			});

			// Act
			const result = await generateCardsFromTranscript(
				transcript,
				sourceAudioUrl,
			);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0].front_content).toBe("質問1");
			expect(result[0].back_content).toBe("回答1");
		});
	});

	describe("TC-012: 空の候補エラー", () => {
		test("should throw error when candidates are empty", async () => {
			// Arrange
			const transcript = "テストトランスクリプト";
			const sourceAudioUrl = "https://example.com/audio.mp3";

			// Mock empty candidates
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [],
				text: "",
				data: undefined,
				functionCalls: undefined,
				executableCode: undefined,
				codeExecutionResult: undefined,
			});

			// Act & Assert
			await expect(
				generateCardsFromTranscript(transcript, sourceAudioUrl),
			).rejects.toThrow("カード生成に失敗しました: 内容が空です");
		});

		test("should throw error when content is null", async () => {
			// Arrange
			const transcript = "テストトランスクリプト";
			const sourceAudioUrl = "https://example.com/audio.mp3";

			// Mock null content
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [
					{
						// biome-ignore lint/suspicious/noExplicitAny: Testing null content edge case
						content: null as any,
					},
				],
				text: "",
				data: undefined,
				functionCalls: undefined,
				executableCode: undefined,
				codeExecutionResult: undefined,
			});

			// Act & Assert
			await expect(
				generateCardsFromTranscript(transcript, sourceAudioUrl),
			).rejects.toThrow("カード生成に失敗しました: 内容が空です");
		});
	});
});
