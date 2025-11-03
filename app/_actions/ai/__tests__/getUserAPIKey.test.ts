/**
 * Tests for getUserAPIKey
 */

import { beforeEach, describe, expect, type Mock, test, vi } from "vitest";

// Set environment variable BEFORE any imports
process.env.ENCRYPTION_KEY =
	"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Mock dependencies BEFORE imports
vi.mock("@/lib/supabase/server", () => ({
	createClient: vi.fn(),
}));

vi.mock("@/lib/encryption/api-key-vault", () => ({
	decryptAPIKey: vi.fn(),
	encryptAPIKey: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
	},
}));

// Import AFTER mocks
import { decryptAPIKey } from "@/lib/encryption/api-key-vault";
import { createClient } from "@/lib/supabase/server";
import { getUserAPIKey } from "../getUserAPIKey";

describe("getUserAPIKey", () => {
	const mockSupabase = {
		auth: {
			getUser: vi.fn(),
		},
		from: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetAllMocks();

		// Reset environment variables
		delete process.env.GEMINI_API_KEY;
		delete process.env.OPENAI_API_KEY;
		delete process.env.ANTHROPIC_API_KEY;

		// Default mock setup
		// biome-ignore lint/suspicious/noExplicitAny: Test mock
		vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
	});

	describe("TC-001: 認証ユーザー、APIキー設定済み", () => {
		test("should return decrypted user API key", async () => {
			// Arrange
			const userId = "user-123";
			const provider = "google";
			const encryptedKey = "encrypted-key-abc";
			const decryptedKey = "decrypted-api-key-xyz";

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: userId } },
				error: null,
			});

			const mockFrom = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { encrypted_api_key: encryptedKey },
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);
			vi.mocked(decryptAPIKey).mockResolvedValue(decryptedKey);

			// Act
			const result = await getUserAPIKey(provider);

			// Assert
			expect(result).toBe(decryptedKey);
			expect(mockSupabase.from).toHaveBeenCalledWith("user_api_keys");
			expect(mockFrom.select).toHaveBeenCalledWith("encrypted_api_key");
			expect(mockFrom.eq).toHaveBeenCalledWith("user_id", userId);
			expect(mockFrom.eq).toHaveBeenCalledWith("provider", provider);
			expect(decryptAPIKey).toHaveBeenCalledWith(encryptedKey);
		});
	});

	describe("TC-002: 認証ユーザー、APIキー未設定、環境変数あり", () => {
		test("should return environment variable API key", async () => {
			// Arrange
			const userId = "user-123";
			const provider = "google";
			const envKey = "env-api-key-123";

			// Set environment variable
			const originalKey = process.env.GEMINI_API_KEY;
			process.env.GEMINI_API_KEY = envKey;

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: userId } },
				error: null,
			});

			const mockFrom = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				// Return error without encrypted_api_key - this should trigger env fallback
				single: vi.fn().mockResolvedValue({
					data: null,
					error: {
						message: "JSON object requested, multiple (or no) rows returned",
						code: "PGRST116",
						details: null,
						hint: null,
					},
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			// Act
			const result = await getUserAPIKey(provider);

			// Assert
			expect(result).toBe(envKey);

			// Cleanup
			if (originalKey) {
				process.env.GEMINI_API_KEY = originalKey;
			} else {
				delete process.env.GEMINI_API_KEY;
			}
		});
	});

	describe("TC-003: 環境変数フォールバック", () => {
		test.each([
			{ provider: "openai", envVar: "OPENAI_API_KEY", envKey: "openai-key" },
			{
				provider: "anthropic",
				envVar: "ANTHROPIC_API_KEY",
				envKey: "anthropic-key",
			},
		])(
			"should return $envVar for provider $provider",
			async ({ provider, envVar, envKey }) => {
				// Arrange
				const userId = "user-123";

				// Set environment variable BEFORE calling the function
				process.env[envVar] = envKey;

				mockSupabase.auth.getUser.mockResolvedValue({
					data: { user: { id: userId } },
					error: null,
				});

				const mockFrom = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: null,
						error: {
							message: "JSON object requested, multiple (or no) rows returned",
							code: "PGRST116",
							details: null,
							hint: null,
						},
					}),
				};

				mockSupabase.from.mockReturnValue(mockFrom);

				// Act
				const result = await getUserAPIKey(provider as "openai" | "anthropic");

				// Assert
				expect(result).toBe(envKey);
				expect(process.env[envVar]).toBe(envKey); // Verify env var is set

				// Cleanup
				delete process.env[envVar];
			},
		);
	});

	describe("TC-004: APIキー完全に未設定", () => {
		test("should throw error when no API key configured", async () => {
			// Arrange
			const userId = "user-123";
			const provider = "google";

			// Clear environment variable
			const originalKey = process.env.GEMINI_API_KEY;
			delete process.env.GEMINI_API_KEY;

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: userId } },
				error: null,
			});

			const mockFrom = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: null,
					error: {
						message: "JSON object requested, multiple (or no) rows returned",
						code: "PGRST116",
						details: null,
						hint: null,
					},
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			// Act & Assert
			await expect(getUserAPIKey(provider)).rejects.toThrow(
				"API key not configured for provider: google. Please set it in Settings.",
			);

			// Cleanup
			if (originalKey) {
				process.env.GEMINI_API_KEY = originalKey;
			}
		});
	});

	describe("TC-005: 不正なプロバイダー", () => {
		test("should throw error for invalid provider", async () => {
			// Arrange
			// biome-ignore lint/suspicious/noExplicitAny: Testing invalid input
			const invalidProvider = "invalid" as any;

			// Act & Assert
			await expect(getUserAPIKey(invalidProvider)).rejects.toThrow(
				"Invalid provider: invalid",
			);
		});
	});

	describe("TC-006: 復号化失敗時の環境変数フォールバック", () => {
		test("should fallback to env var when decryption fails", async () => {
			// Arrange
			const userId = "user-123";
			const provider = "google";
			const envKey = "fallback-env-key";

			// Set environment variable BEFORE calling function
			process.env.GEMINI_API_KEY = envKey;

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: { id: userId } },
				error: null,
			});

			const encryptedKey = "encrypted-key-123";

			const mockFrom = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { encrypted_api_key: encryptedKey },
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(mockFrom);

			// Mock decryption failure for this test only
			(decryptAPIKey as Mock).mockRejectedValueOnce(
				new Error("Decryption failed"),
			);

			// Act
			const result = await getUserAPIKey(provider);

			// Assert
			expect(result).toBe(envKey);
			expect(decryptAPIKey).toHaveBeenCalledWith(encryptedKey);

			// Cleanup
			delete process.env.GEMINI_API_KEY;
		});
	});

	describe("Additional edge cases", () => {
		test("should handle empty string environment variable", async () => {
			// Arrange
			const provider = "google";
			process.env.GEMINI_API_KEY = "   "; // Empty string with spaces

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: null },
				// biome-ignore lint/suspicious/noExplicitAny: Test mock
				error: { message: "Not authenticated" } as any,
			});

			// Act & Assert
			await expect(getUserAPIKey(provider)).rejects.toThrow(
				"API key not configured for provider: google. Please set it in Settings.",
			);
		});

		test("should handle all three providers correctly", async () => {
			// Arrange
			const providers = ["google", "openai", "anthropic"] as const;
			const envKeys = {
				google: "google-key",
				openai: "openai-key",
				anthropic: "anthropic-key",
			};

			// Save original values
			const originalKeys = {
				google: process.env.GEMINI_API_KEY,
				openai: process.env.OPENAI_API_KEY,
				anthropic: process.env.ANTHROPIC_API_KEY,
			};

			// Set test environment variables
			process.env.GEMINI_API_KEY = envKeys.google;
			process.env.OPENAI_API_KEY = envKeys.openai;
			process.env.ANTHROPIC_API_KEY = envKeys.anthropic;

			mockSupabase.auth.getUser.mockResolvedValue({
				data: { user: null },
				// biome-ignore lint/suspicious/noExplicitAny: Test mock
				error: { message: "Not authenticated" } as any,
			});

			// Act & Assert
			for (const provider of providers) {
				const result = await getUserAPIKey(provider);
				expect(result).toBe(envKeys[provider]);
			}

			// Cleanup
			process.env.GEMINI_API_KEY = originalKeys.google;
			process.env.OPENAI_API_KEY = originalKeys.openai;
			process.env.ANTHROPIC_API_KEY = originalKeys.anthropic;
		});
	});
});
