/**
 * Tests for API Key Management API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/ai/api-key/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ lib/encryption/api-key-vault.ts (encryptAPIKey - mocked)
 *   ├─ lib/llm/client.ts (createLLMClient - mocked)
 *   ├─ lib/supabase/server.ts (createClient - mocked)
 *   └─ lib/logger.ts (logger - mocked)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies BEFORE imports
vi.mock("@/lib/encryption/api-key-vault", () => ({
	encryptAPIKey: vi.fn(),
}));

vi.mock("@/lib/llm/client", async () => {
	const actual = await vi.importActual("@/lib/llm/client");
	return {
		...actual,
		createLLMClient: vi.fn(),
	};
});

vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import type { NextRequest } from "next/server";
import { encryptAPIKey } from "@/lib/encryption/api-key-vault";
import { createLLMClient } from "@/lib/llm/client";
import { createClient } from "@/lib/supabase/server";
import { DELETE, GET, POST } from "../route";

// Helper: Create mock NextRequest
function createMockRequest(body?: unknown): NextRequest {
	return {
		json: async () => body || {},
	} as NextRequest;
}

// Helper: Create mock Supabase client with authenticated user
function createMockSupabaseClient(authenticated = true) {
	const mockFrom = vi.fn(() => ({
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		upsert: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		single: vi.fn(),
	}));

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
		from: mockFrom,
	};
}

describe("GET /api/ai/api-key", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================
	// TC-001: APIキー状態の取得
	// ========================================
	describe("TC-001: Get API key status", () => {
		it("should return API key status successfully", async () => {
			const mockClient = createMockSupabaseClient();
			vi.mocked(createClient).mockResolvedValue(mockClient as never);

			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: [
					{
						provider: "google",
						updated_at: "2025-01-01T00:00:00Z",
					},
				],
				error: null,
			});

			vi.mocked(mockClient.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle,
			} as never);

			mockSelect.mockReturnValue({
				eq: mockEq,
			});
			mockEq.mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: [
						{
							provider: "google",
							updated_at: "2025-01-01T00:00:00Z",
						},
					],
					error: null,
				}),
			});

			const request = createMockRequest();

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.data.google.configured).toBe(true);
			expect(data.data.openai.configured).toBe(false);
			expect(data.data.anthropic.configured).toBe(false);
		});
	});

	// ========================================
	// TC-002: 認証エラー
	// ========================================
	describe("TC-002: Authentication error", () => {
		it("should return 401 when user is not authenticated", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(false) as never,
			);

			const request = createMockRequest();

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("認証が必要です");
		});
	});

	// ========================================
	// TC-003: 状態取得エラー
	// ========================================
	describe("TC-003: Status retrieval error", () => {
		it("should return 500 when status retrieval fails", async () => {
			const mockClient = createMockSupabaseClient();
			vi.mocked(createClient).mockResolvedValue(mockClient as never);

			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();

			vi.mocked(mockClient.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
			} as never);

			mockSelect.mockReturnValue({
				eq: mockEq,
			});
			mockEq.mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "データベースエラー" },
				}),
			});

			const request = createMockRequest();

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("データベースエラーが発生しました");
		});
	});
});

describe("POST /api/ai/api-key", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================
	// TC-001: APIキーの保存（テストなし）
	// ========================================
	describe("TC-001: Save API key without test", () => {
		it("should save API key successfully", async () => {
			const mockClient = createMockSupabaseClient();
			vi.mocked(createClient).mockResolvedValue(mockClient as never);

			vi.mocked(encryptAPIKey).mockResolvedValue("encrypted-key");

			const mockUpsert = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});

			vi.mocked(mockClient.from).mockReturnValue({
				upsert: mockUpsert,
			} as never);

			const request = createMockRequest({
				provider: "google",
				apiKey: "test-api-key",
				test: false,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe("APIキーを保存しました");
			expect(encryptAPIKey).toHaveBeenCalledWith("test-api-key");
			expect(mockUpsert).toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-002: APIキーの保存（テストあり）
	// ========================================
	describe("TC-002: Save API key with test", () => {
		it("should test API key before saving", async () => {
			const mockClient = createMockSupabaseClient();
			vi.mocked(createClient).mockResolvedValue(mockClient as never);

			const mockLLMClient = {
				generate: vi.fn().mockResolvedValue("こんにちは"),
			};
			vi.mocked(createLLMClient).mockResolvedValue(mockLLMClient as never);

			vi.mocked(encryptAPIKey).mockResolvedValue("encrypted-key");

			const mockUpsert = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});

			vi.mocked(mockClient.from).mockReturnValue({
				upsert: mockUpsert,
			} as never);

			const request = createMockRequest({
				provider: "openai",
				apiKey: "test-api-key",
				test: true,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe("APIキーを保存しました");
			expect(createLLMClient).toHaveBeenCalledWith({
				provider: "openai",
				apiKey: "test-api-key",
			});
			expect(mockLLMClient.generate).toHaveBeenCalledWith("こんにちは");
			expect(encryptAPIKey).toHaveBeenCalledWith("test-api-key");
		});
	});

	// ========================================
	// TC-003: APIキーテスト失敗
	// ========================================
	describe("TC-003: API key test failure", () => {
		it("should return 400 when API key test fails", async () => {
			const mockClient = createMockSupabaseClient();
			vi.mocked(createClient).mockResolvedValue(mockClient as never);

			const mockLLMClient = {
				generate: vi.fn().mockRejectedValue(new Error("API_KEY_INVALID")),
			};
			vi.mocked(createLLMClient).mockResolvedValue(mockLLMClient as never);

			const request = createMockRequest({
				provider: "google",
				apiKey: "invalid-key",
				test: true,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("APIキーが無効です");
			expect(encryptAPIKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-004: 認証エラー
	// ========================================
	describe("TC-004: Authentication error", () => {
		it("should return 401 when user is not authenticated", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(false) as never,
			);

			const request = createMockRequest({
				provider: "google",
				apiKey: "test-api-key",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("認証が必要です");
			expect(encryptAPIKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-005: バリデーションエラー（provider未指定）
	// ========================================
	describe("TC-005: Validation error - missing provider", () => {
		it("should return 400 when provider is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				apiKey: "test-api-key",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("providerは必須です");
			expect(encryptAPIKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-006: バリデーションエラー（apiKey未指定）
	// ========================================
	describe("TC-006: Validation error - missing apiKey", () => {
		it("should return 400 when apiKey is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				provider: "google",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("apiKeyは必須です");
			expect(encryptAPIKey).not.toHaveBeenCalled();
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
				provider: "invalid-provider",
				apiKey: "test-api-key",
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("無効なproviderです");
			expect(encryptAPIKey).not.toHaveBeenCalled();
		});
	});
});

describe("DELETE /api/ai/api-key", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ========================================
	// TC-001: APIキーの削除
	// ========================================
	describe("TC-001: Delete API key", () => {
		it("should delete API key successfully", async () => {
			const mockClient = createMockSupabaseClient();
			vi.mocked(createClient).mockResolvedValue(mockClient as never);

			const mockDelete = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockResolvedValue({
				data: null,
				error: null,
			});

			vi.mocked(mockClient.from).mockReturnValue({
				delete: mockDelete,
				eq: mockEq,
			} as never);

			mockDelete.mockReturnValue({
				eq: mockEq,
			});
			mockEq.mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: null,
					error: null,
				}),
			});

			const request = createMockRequest({
				provider: "google",
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe("APIキーを削除しました");
			expect(mockClient.from).toHaveBeenCalledWith("user_api_keys");
		});
	});

	// ========================================
	// TC-002: 認証エラー
	// ========================================
	describe("TC-002: Authentication error", () => {
		it("should return 401 when user is not authenticated", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient(false) as never,
			);

			const request = createMockRequest({
				provider: "google",
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("認証が必要です");
		});
	});

	// ========================================
	// TC-003: バリデーションエラー（provider未指定）
	// ========================================
	describe("TC-003: Validation error - missing provider", () => {
		it("should return 400 when provider is missing", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("providerは必須です");
		});
	});

	// ========================================
	// TC-004: バリデーションエラー（不正なprovider）
	// ========================================
	describe("TC-004: Validation error - invalid provider", () => {
		it("should return 400 when provider is invalid", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			const request = createMockRequest({
				provider: "invalid-provider",
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toContain("無効なproviderです");
		});
	});

	// ========================================
	// TC-005: 削除エラー
	// ========================================
	describe("TC-005: Delete error", () => {
		it("should return 500 when delete fails", async () => {
			const mockClient = createMockSupabaseClient();
			vi.mocked(createClient).mockResolvedValue(mockClient as never);

			const mockDelete = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockResolvedValue({
				data: null,
				error: { message: "削除に失敗しました" },
			});

			vi.mocked(mockClient.from).mockReturnValue({
				delete: mockDelete,
				eq: mockEq,
			} as never);

			mockDelete.mockReturnValue({
				eq: mockEq,
			});
			mockEq.mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					data: null,
					error: { message: "削除に失敗しました" },
				}),
			});

			const request = createMockRequest({
				provider: "google",
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("データベースエラーが発生しました");
		});
	});
});
