/**
 * Tests for createClientWithUserKey factory function
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ lib/llm/factory.ts
 *
 * Dependencies (Mocks):
 *   ├─ lib/llm/client.ts (createLLMClient)
 *   ├─ lib/supabase/client.ts (createClient)
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ../factory.spec.md (to be created)
 *   ├─ Implementation: ../factory.ts
 *   └─ Plan: docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock dependencies BEFORE imports
vi.mock("@/lib/llm/client", () => ({
	createLLMClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
	createClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock("@/lib/encryption/api-key-vault", () => ({
	decryptAPIKey: vi.fn(),
}));

import { decryptAPIKey } from "@/lib/encryption/api-key-vault";
// Import AFTER mocks
import {
	createLLMClient,
	type LLMClient,
	type LLMProvider,
} from "@/lib/llm/client";
import { createClient } from "@/lib/supabase/client";
import { createClientWithUserKey } from "../factory";

// Mock LLMClient implementation
class MockLLMClient implements LLMClient {
	async generate(prompt: string): Promise<string> {
		return `Mock response for: ${prompt}`;
	}

	async *generateStream(prompt: string): AsyncGenerator<string> {
		yield `Mock stream: ${prompt}`;
	}
}

describe("createClientWithUserKey", () => {
	const mockClient: LLMClient = new MockLLMClient();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();
	});

	// ========================================
	// TC-001: Google Gemini クライアント生成
	// ========================================
	describe("TC-001: Google Gemini client creation", () => {
		test("should create Google Gemini client with user API key from database", async () => {
			// Arrange
			const provider: LLMProvider = "google";
			const userApiKey = "user-google-api-key-123";
			const encryptedApiKey = "encrypted-key-123";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(userApiKey);
			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			const client = await createClientWithUserKey({ provider });

			// Assert
			expect(client).toBe(mockClient);
			expect(decryptAPIKey).toHaveBeenCalledWith(encryptedApiKey);
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model: undefined,
				apiKey: userApiKey,
			});
		});

		test("should create Google Gemini client with specific model", async () => {
			// Arrange
			const provider: LLMProvider = "google";
			const model = "gemini-1.5-pro";
			const userApiKey = "user-google-api-key-123";
			const encryptedApiKey = "encrypted-key-123";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(userApiKey);
			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			const client = await createClientWithUserKey({ provider, model });

			// Assert
			expect(client).toBe(mockClient);
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model,
				apiKey: userApiKey,
			});
		});
	});

	// ========================================
	// TC-002: OpenAI クライアント生成
	// ========================================
	describe("TC-002: OpenAI client creation", () => {
		test("should create OpenAI client with user API key from database", async () => {
			// Arrange
			const provider: LLMProvider = "openai";
			const userApiKey = "sk-user-openai-key-123";
			const encryptedApiKey = "encrypted-key-123";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(userApiKey);
			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			const client = await createClientWithUserKey({ provider });

			// Assert
			expect(client).toBe(mockClient);
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model: undefined,
				apiKey: userApiKey,
			});
		});

		test("should create OpenAI client with specific model", async () => {
			// Arrange
			const provider: LLMProvider = "openai";
			const model = "gpt-4-turbo";
			const userApiKey = "sk-user-openai-key-123";
			const encryptedApiKey = "encrypted-key-123";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(userApiKey);
			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			const client = await createClientWithUserKey({ provider, model });

			// Assert
			expect(client).toBe(mockClient);
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model,
				apiKey: userApiKey,
			});
		});
	});

	// ========================================
	// TC-003: Anthropic クライアント生成
	// ========================================
	describe("TC-003: Anthropic client creation", () => {
		test("should create Anthropic client with user API key from database", async () => {
			// Arrange
			const provider: LLMProvider = "anthropic";
			const userApiKey = "sk-ant-user-anthropic-key-123";
			const encryptedApiKey = "encrypted-key-123";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(userApiKey);
			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			const client = await createClientWithUserKey({ provider });

			// Assert
			expect(client).toBe(mockClient);
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model: undefined,
				apiKey: userApiKey,
			});
		});

		test("should create Anthropic client with specific model", async () => {
			// Arrange
			const provider: LLMProvider = "anthropic";
			const model = "claude-3-opus-20240229";
			const userApiKey = "sk-ant-user-anthropic-key-123";
			const encryptedApiKey = "encrypted-key-123";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(userApiKey);
			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			const client = await createClientWithUserKey({ provider, model });

			// Assert
			expect(client).toBe(mockClient);
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model,
				apiKey: userApiKey,
			});
		});
	});

	// ========================================
	// TC-004: 無効なプロバイダーでエラー
	// ========================================
	describe("TC-004: Invalid provider error handling", () => {
		test("should propagate error from createLLMClient for invalid provider", async () => {
			// Arrange
			const provider = "invalid" as LLMProvider;
			const userApiKey = "some-api-key";
			const encryptedApiKey = "encrypted-key-123";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(userApiKey);
			vi.mocked(createLLMClient).mockRejectedValue(
				new Error("Invalid provider: invalid"),
			);

			// Act & Assert
			await expect(createClientWithUserKey({ provider })).rejects.toThrow(
				"Invalid provider: invalid",
			);

			expect(createLLMClient).toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-005: APIキー未設定時のフォールバック
	// ========================================
	describe("TC-005: API key fallback behavior", () => {
		test("should use API key from database when apiKey not provided", async () => {
			// Arrange
			const provider: LLMProvider = "google";
			const userApiKey = "user-google-api-key-123";
			const encryptedApiKey = "encrypted-key-123";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(userApiKey);
			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			const client = await createClientWithUserKey({ provider });

			// Assert
			expect(client).toBe(mockClient);
			expect(decryptAPIKey).toHaveBeenCalledWith(encryptedApiKey);
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model: undefined,
				apiKey: userApiKey,
			});
		});

		test("should fallback to environment variable when database query fails", async () => {
			// Arrange
			const provider: LLMProvider = "google";
			const envApiKey = "env-fallback-key";

			// Mock environment variable
			const originalEnv = process.env.GEMINI_API_KEY;
			process.env.GEMINI_API_KEY = envApiKey;

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { code: "PGRST116", message: "No rows found" },
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			try {
				// Act
				const client = await createClientWithUserKey({ provider });

				// Assert
				expect(client).toBe(mockClient);
				expect(createLLMClient).toHaveBeenCalledWith({
					provider,
					model: undefined,
					apiKey: envApiKey,
				});
			} finally {
				// Restore original environment variable
				if (originalEnv !== undefined) {
					process.env.GEMINI_API_KEY = originalEnv;
				} else {
					delete process.env.GEMINI_API_KEY;
				}
			}
		});
	});

	// ========================================
	// TC-006: 提供されたAPIキーの優先使用
	// ========================================
	describe("TC-006: Provided API key priority", () => {
		test("should use provided API key instead of fetching from database", async () => {
			// Arrange
			const provider: LLMProvider = "google";
			const providedApiKey = "explicit-api-key-123";

			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			const client = await createClientWithUserKey({
				provider,
				apiKey: providedApiKey,
			});

			// Assert
			expect(client).toBe(mockClient);
			expect(createClient).not.toHaveBeenCalled();
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model: undefined,
				apiKey: providedApiKey,
			});
		});

		test("should use provided API key with model", async () => {
			// Arrange
			const provider: LLMProvider = "openai";
			const model = "gpt-4o";
			const providedApiKey = "explicit-openai-key-123";

			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			const client = await createClientWithUserKey({
				provider,
				model,
				apiKey: providedApiKey,
			});

			// Assert
			expect(client).toBe(mockClient);
			expect(createClient).not.toHaveBeenCalled();
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model,
				apiKey: providedApiKey,
			});
		});

		test("should handle empty string as provided API key (should pass to createLLMClient)", async () => {
			// Arrange
			const provider: LLMProvider = "google";
			const providedApiKey = "";

			vi.mocked(createLLMClient).mockRejectedValue(
				new Error("API key is required"),
			);

			// Act & Assert
			await expect(
				createClientWithUserKey({
					provider,
					apiKey: providedApiKey,
				}),
			).rejects.toThrow("API key is required");

			expect(createClient).not.toHaveBeenCalled();
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model: undefined,
				apiKey: providedApiKey,
			});
		});
	});

	// ========================================
	// TC-007: モデル指定の動作確認
	// ========================================
	describe("TC-007: Model specification behavior", () => {
		test.each([
			{
				provider: "google" as const,
				model: "gemini-1.5-flash",
				apiKey: "google-key",
			},
			{
				provider: "openai" as const,
				model: "gpt-3.5-turbo",
				apiKey: "openai-key",
			},
			{
				provider: "anthropic" as const,
				model: "claude-3-haiku-20240307",
				apiKey: "anthropic-key",
			},
		])(
			"should pass model $model to createLLMClient for provider $provider",
			async ({ provider, model, apiKey }) => {
				// Arrange
				const encryptedApiKey = "encrypted-key-123";
				const mockSupabaseClient = {
					auth: {
						getUser: vi.fn().mockResolvedValue({
							data: { user: { id: "user-123" } },
							error: null,
						}),
					},
					from: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						single: vi.fn().mockResolvedValue({
							data: { encrypted_api_key: encryptedApiKey },
							error: null,
						}),
					}),
				};

				vi.mocked(createClient).mockReturnValue(
					mockSupabaseClient as unknown as ReturnType<typeof createClient>,
				);
				vi.mocked(decryptAPIKey).mockResolvedValue(apiKey);
				vi.mocked(createLLMClient).mockResolvedValue(mockClient);

				// Act
				await createClientWithUserKey({ provider, model });

				// Assert
				expect(createLLMClient).toHaveBeenCalledWith({
					provider,
					model,
					apiKey,
				});
			},
		);

		test("should pass undefined model when not specified (uses default)", async () => {
			// Arrange
			const provider: LLMProvider = "google";
			const apiKey = "google-key";
			const encryptedApiKey = "encrypted-key-123";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(apiKey);
			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act
			await createClientWithUserKey({ provider });

			// Assert
			expect(createLLMClient).toHaveBeenCalledWith({
				provider,
				model: undefined,
				apiKey,
			});
		});
	});

	// ========================================
	// Additional edge cases
	// ========================================
	describe("Additional edge cases", () => {
		test("should propagate createLLMClient errors correctly", async () => {
			// Arrange
			const provider: LLMProvider = "google";
			const apiKey = "test-key";
			const encryptedApiKey = "encrypted-key-123";
			const errorMessage = "Failed to create client: Network error";

			const mockSupabaseClient = {
				auth: {
					getUser: vi.fn().mockResolvedValue({
						data: { user: { id: "user-123" } },
						error: null,
					}),
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: { encrypted_api_key: encryptedApiKey },
						error: null,
					}),
				}),
			};

			vi.mocked(createClient).mockReturnValue(
				mockSupabaseClient as unknown as ReturnType<typeof createClient>,
			);
			vi.mocked(decryptAPIKey).mockResolvedValue(apiKey);
			vi.mocked(createLLMClient).mockRejectedValue(new Error(errorMessage));

			// Act & Assert
			await expect(createClientWithUserKey({ provider })).rejects.toThrow(
				errorMessage,
			);

			expect(createLLMClient).toHaveBeenCalled();
		});

		test("should handle all three providers correctly", async () => {
			// Arrange
			const providers: LLMProvider[] = ["google", "openai", "anthropic"];
			const apiKeys = {
				google: "google-key",
				openai: "openai-key",
				anthropic: "anthropic-key",
			};

			vi.mocked(createLLMClient).mockResolvedValue(mockClient);

			// Act & Assert
			for (const provider of providers) {
				const encryptedApiKey = "encrypted-key-123";
				const mockSupabaseClient = {
					auth: {
						getUser: vi.fn().mockResolvedValue({
							data: { user: { id: "user-123" } },
							error: null,
						}),
					},
					from: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						single: vi.fn().mockResolvedValue({
							data: { encrypted_api_key: encryptedApiKey },
							error: null,
						}),
					}),
				};

				vi.mocked(createClient).mockReturnValue(
					mockSupabaseClient as unknown as ReturnType<typeof createClient>,
				);
				vi.mocked(decryptAPIKey).mockResolvedValue(apiKeys[provider]);

				const client = await createClientWithUserKey({ provider });

				expect(client).toBe(mockClient);
				expect(createLLMClient).toHaveBeenCalledWith({
					provider,
					model: undefined,
					apiKey: apiKeys[provider],
				});

				vi.clearAllMocks();
			}
		});
	});
});
