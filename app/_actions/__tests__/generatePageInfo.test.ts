/**
 * Tests for generatePageInfo with getUserAPIKey integration
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

// Setup environment BEFORE imports
process.env.ENCRYPTION_KEY =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Mock dependencies BEFORE imports
vi.mock("@/app/_actions/ai/getUserAPIKey", () => ({
	getUserAPIKey: vi.fn(),
}));

vi.mock("@/app/_actions/promptService", () => ({
	getPromptTemplate: vi.fn(),
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
import { getPromptTemplate } from "@/app/_actions/promptService";
import { geminiClient } from "@/lib/gemini/client";
// Import AFTER mocks
import { generatePageInfo } from "../generatePageInfo";

/**
 * ヘルパー: Gemini APIの戻り値をモック用に構築
 * @param text - 生成されたテキスト
 * @returns 型安全なモック用レスポンスオブジェクト
 *
 * GenerateContentResponse型の必須プロパティ(text, data, functionCalls等)も
 * 統一されたため、mockResolvedValueで直接受け付ける
 */
function createMockGeminiResponse(text: string) {
	return {
		candidates: [
			{
				content: {
					parts: [{ text }],
				},
			},
		],
		// GenerateContentResponse が要求する必須プロパティをモック
		text,
		data: undefined,
		functionCalls: undefined,
		executableCode: undefined,
		codeExecutionResult: undefined,
	};
}

describe("generatePageInfo - Phase 1.0 Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock implementations
		vi.mocked(getPromptTemplate).mockResolvedValue("Generate markdown about: ");
		vi.mocked(getUserAPIKey).mockResolvedValue("test-api-key");
	});

	describe("TC-001: 基本的なMarkdown生成（Google Gemini）", () => {
		test("should generate markdown and call getUserAPIKey with google", async () => {
			// Arrange
			const title = "React Hooks入門";
			const provider = "google";

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse("# Title\n\n## Section\n\nContent"),
			);

			// Act
			const result = await generatePageInfo(title, { provider });

			// Assert
			expect(getUserAPIKey).toHaveBeenCalledWith(provider);
			expect(result).toContain("## Section");
			expect(result).not.toMatch(/^# /);
		});
	});

	describe("TC-002: OpenAIプロバイダー選択", () => {
		test("should use OpenAI provider when specified", async () => {
			// Arrange
			const title = "TypeScript型システム";
			const provider = "openai";

			vi.mocked(getUserAPIKey).mockResolvedValue("openai-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse("## Content"),
			);

			// Act
			const result = await generatePageInfo(title, { provider });

			// Assert
			expect(getUserAPIKey).toHaveBeenCalledWith(provider);
			expect(result).toContain("## Content");
		});
	});

	describe("TC-003: Anthropicプロバイダー選択", () => {
		test("should use Anthropic provider when specified", async () => {
			// Arrange
			const title = "分散システム設計";
			const provider = "anthropic";

			vi.mocked(getUserAPIKey).mockResolvedValue("anthropic-api-key");
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse("## Design Patterns"),
			);

			// Act
			const result = await generatePageInfo(title, { provider });

			// Assert
			expect(getUserAPIKey).toHaveBeenCalledWith(provider);
			expect(result).toContain("## Design Patterns");
		});
	});

	describe("TC-004: 空のタイトルエラー", () => {
		test("should throw error when title is empty", async () => {
			// Arrange
			const title = "";

			// Act & Assert
			await expect(generatePageInfo(title)).rejects.toThrow("タイトルが空です");
			expect(getUserAPIKey).not.toHaveBeenCalled();
		});
	});

	describe("TC-005: ユーザーAPIキー優先", () => {
		test("should call getUserAPIKey before generating", async () => {
			// Arrange
			const title = "Next.js App Router";
			const userApiKey = "user-configured-key";

			vi.mocked(getUserAPIKey).mockResolvedValue(userApiKey);
			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse("## Framework"),
			);

			// Act
			const result = await generatePageInfo(title);

			// Assert
			expect(getUserAPIKey).toHaveBeenCalledWith("google");
			expect(result).toBeDefined();
		});
	});

	describe("TC-006: APIキー未設定エラー", () => {
		test("should propagate error when getUserAPIKey throws", async () => {
			// Arrange
			const title = "Vue.js Composition API";
			const provider = "openai";
			const errorMsg =
				"API key not configured for provider: openai. Please set it in Settings.";

			vi.mocked(getUserAPIKey).mockRejectedValue(new Error(errorMsg));

			// Act & Assert
			await expect(generatePageInfo(title, { provider })).rejects.toThrow(
				errorMsg,
			);
		});
	});

	describe("TC-007: 不正なプロバイダーエラー", () => {
		test("should propagate error from getUserAPIKey for invalid provider", async () => {
			// Arrange
			const title = "テスト";

			vi.mocked(getUserAPIKey).mockRejectedValue(
				new Error("Invalid provider: invalid_provider"),
			);

			// Act & Assert
			await expect(
				generatePageInfo(title, {
					provider: "invalid_provider" as "google",
				}),
			).rejects.toThrow("Invalid provider");
		});
	});

	describe("TC-008: LLM API呼び出し失敗", () => {
		test("should throw error when LLM API fails", async () => {
			// Arrange
			const title = "テスト";

			vi.mocked(geminiClient.models.generateContent).mockRejectedValue(
				new Error("API Error"),
			);

			// Act & Assert
			await expect(generatePageInfo(title)).rejects.toThrow("API Error");
		});
	});

	describe("TC-009: コードフェンス抽出", () => {
		test("should extract content from markdown code fence", async () => {
			// Arrange
			const title = "テスト";
			const fencedContent = "```markdown\n## Section\nContent\n```";

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse(fencedContent),
			);

			// Act
			const result = await generatePageInfo(title);

			// Assert
			expect(result).toContain("## Section");
			expect(result).toContain("Content");
			expect(result).not.toContain("```");
		});
	});

	describe("TC-010: デフォルトプロバイダー", () => {
		test("should use default provider (google) when not specified", async () => {
			// Arrange
			const title = "デフォルト テスト";

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
				createMockGeminiResponse("## Default"),
			);

			// Act
			const result = await generatePageInfo(title);

			// Assert
			expect(getUserAPIKey).toHaveBeenCalledWith("google");
			expect(result).toContain("## Default");
		});
	});

	describe("TC-011: レスポンスがない場合", () => {
		test("should throw error when LLM returns no candidates", async () => {
			// Arrange
			const title = "テスト";

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: undefined,
				text: undefined,
				data: undefined,
				functionCalls: undefined,
				executableCode: undefined,
				codeExecutionResult: undefined,
			});

			// Act & Assert
			await expect(generatePageInfo(title)).rejects.toThrow(
				"コンテンツ生成に失敗しました",
			);
		});
	});

	describe("TC-012: String型レスポンス", () => {
		test("should handle string type content directly", async () => {
			// Arrange
			const title = "テスト";
			const content = "## Direct String Content\n\nText here";

			vi.mocked(geminiClient.models.generateContent).mockResolvedValue({
				candidates: [
					{
						content: {
							parts: [{ text: content }],
						},
					},
				],
				text: content,
				data: undefined,
				functionCalls: undefined,
				executableCode: undefined,
				codeExecutionResult: undefined,
			});

			// Act
			const result = await generatePageInfo(title);

			// Assert
			expect(result).toContain("## Direct String Content");
		});
	});
});
