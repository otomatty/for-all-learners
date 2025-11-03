/**
 * Tests for generatePageInfo with dynamic LLM client integration
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

// Setup environment BEFORE imports
process.env.ENCRYPTION_KEY =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Mock dependencies BEFORE imports
vi.mock("@/app/_actions/promptService", () => ({
	getPromptTemplate: vi.fn(),
}));

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

import { getPromptTemplate } from "@/app/_actions/promptService";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { buildPrompt } from "@/lib/llm/prompt-builder";
import type { LLMClient } from "@/lib/llm/client";
// Import AFTER mocks
import { generatePageInfo } from "../generatePageInfo";

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

describe("generatePageInfo - Dynamic LLM Client Integration", () => {
	const mockClient: LLMClient = new MockLLMClient();

	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock implementations
		vi.mocked(getPromptTemplate).mockResolvedValue("Generate markdown about: ");
		vi.mocked(buildPrompt).mockImplementation((parts) => {
			return Array.isArray(parts) ? parts.join("\n\n") : "";
		});
		vi.mocked(createClientWithUserKey).mockResolvedValue(mockClient);
		// Mock generate to return markdown content
		vi.spyOn(mockClient, "generate").mockResolvedValue(
			"# Title\n\n## Section\n\nContent",
		);
	});

	describe("TC-001: 基本的なMarkdown生成（Google Gemini）", () => {
		test("should generate markdown and call createClientWithUserKey with google", async () => {
			// Arrange
			const title = "React Hooks入門";
			const provider = "google";

			vi.spyOn(mockClient, "generate").mockResolvedValue(
				"# Title\n\n## Section\n\nContent",
			);

			// Act
			const result = await generatePageInfo(title, { provider });

			// Assert
			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider,
				model: undefined,
			});
			expect(buildPrompt).toHaveBeenCalled();
			expect(mockClient.generate).toHaveBeenCalled();
			expect(result).toContain("## Section");
			expect(result).not.toMatch(/^# /);
		});
	});

	describe("TC-002: OpenAIプロバイダー選択", () => {
		test("should use OpenAI provider when specified", async () => {
			// Arrange
			const title = "TypeScript型システム";
			const provider = "openai";

			vi.spyOn(mockClient, "generate").mockResolvedValue("## Content");

			// Act
			const result = await generatePageInfo(title, { provider });

			// Assert
			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider,
				model: undefined,
			});
			expect(result).toContain("## Content");
		});
	});

	describe("TC-003: Anthropicプロバイダー選択", () => {
		test("should use Anthropic provider when specified", async () => {
			// Arrange
			const title = "分散システム設計";
			const provider = "anthropic";

			vi.spyOn(mockClient, "generate").mockResolvedValue("## Design Patterns");

			// Act
			const result = await generatePageInfo(title, { provider });

			// Assert
			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider,
				model: undefined,
			});
			expect(result).toContain("## Design Patterns");
		});
	});

	describe("TC-004: 空のタイトルエラー", () => {
		test("should throw error when title is empty", async () => {
			// Arrange
			const title = "";

			// Act & Assert
			await expect(generatePageInfo(title)).rejects.toThrow("タイトルが空です");
			expect(createClientWithUserKey).not.toHaveBeenCalled();
		});
	});

	describe("TC-005: ユーザーAPIキー優先", () => {
		test("should call createClientWithUserKey for API key resolution", async () => {
			// Arrange
			const title = "Next.js App Router";

			vi.spyOn(mockClient, "generate").mockResolvedValue("## Framework");

			// Act
			const result = await generatePageInfo(title);

			// Assert
			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result).toBeDefined();
		});
	});

	describe("TC-006: APIキー未設定エラー", () => {
		test("should propagate error when createClientWithUserKey throws", async () => {
			// Arrange
			const title = "Vue.js Composition API";
			const provider = "openai";
			const errorMsg =
				"API key not configured for provider: openai. Please set it in Settings.";

			vi.mocked(createClientWithUserKey).mockRejectedValue(new Error(errorMsg));

			// Act & Assert
			await expect(generatePageInfo(title, { provider })).rejects.toThrow(
				errorMsg,
			);
		});
	});

	describe("TC-007: 不正なプロバイダーエラー", () => {
		test("should propagate error from createClientWithUserKey for invalid provider", async () => {
			// Arrange
			const title = "テスト";

			vi.mocked(createClientWithUserKey).mockRejectedValue(
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

			vi.spyOn(mockClient, "generate").mockRejectedValue(
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

			vi.spyOn(mockClient, "generate").mockResolvedValue(fencedContent);

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

			vi.spyOn(mockClient, "generate").mockResolvedValue("## Default");

			// Act
			const result = await generatePageInfo(title);

			// Assert
			expect(createClientWithUserKey).toHaveBeenCalledWith({
				provider: "google",
				model: undefined,
			});
			expect(result).toContain("## Default");
		});
	});

	describe("TC-011: レスポンスがない場合", () => {
		test("should handle empty response gracefully", async () => {
			// Arrange
			const title = "テスト";

			vi.spyOn(mockClient, "generate").mockResolvedValue("");

			// Act
			const result = await generatePageInfo(title);

			// Assert
			// Empty response should be handled (trimmed to empty string)
			expect(result).toBe("");
		});
	});

	describe("TC-012: String型レスポンス", () => {
		test("should handle string type content directly", async () => {
			// Arrange
			const title = "テスト";
			const content = "## Direct String Content\n\nText here";

			vi.spyOn(mockClient, "generate").mockResolvedValue(content);

			// Act
			const result = await generatePageInfo(title);

			// Assert
			expect(result).toContain("## Direct String Content");
		});
	});
});
