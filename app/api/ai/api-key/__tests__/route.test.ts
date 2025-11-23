/**
 * Tests for API Key Management API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ app/api/ai/api-key/route.ts
 *
 * Dependencies (Mocks):
 *   ├─ app/_actions/ai/apiKey.ts (getAPIKeyStatus, saveAPIKey, deleteAPIKey, testAPIKey - mocked)
 *   ├─ lib/supabase/server.ts (createClient - mocked)
 *   └─ lib/logger.ts (logger - mocked)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies BEFORE imports
vi.mock("@/app/_actions/ai/apiKey");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/logger");

import type { NextRequest } from "next/server";
import {
	deleteAPIKey,
	getAPIKeyStatus,
	saveAPIKey,
	testAPIKey,
} from "@/app/_actions/ai/apiKey";
import { createClient } from "@/lib/supabase/server";
import { GET, POST, DELETE } from "../route";

// Helper: Create mock NextRequest
function createMockRequest(body?: unknown): NextRequest {
	return {
		json: async () => body || {},
	} as NextRequest;
}

// Helper: Create mock Supabase client with authenticated user
function createMockSupabaseClient(authenticated = true) {
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
			const mockStatus = {
				google: { configured: true, updatedAt: "2025-01-01T00:00:00Z" },
				openai: { configured: false, updatedAt: null },
				anthropic: { configured: false, updatedAt: null },
			};

			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(getAPIKeyStatus).mockResolvedValue({
				success: true,
				data: mockStatus,
			});

			const request = createMockRequest();

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.data).toEqual(mockStatus);
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
			expect(getAPIKeyStatus).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-003: 状態取得エラー
	// ========================================
	describe("TC-003: Status retrieval error", () => {
		it("should return 500 when status retrieval fails", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(getAPIKeyStatus).mockResolvedValue({
				success: false,
				error: "データベースエラー",
			});

			const request = createMockRequest();

			const response = await GET(request);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBe("データベースエラー");
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
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(saveAPIKey).mockResolvedValue({
				success: true,
				message: "APIキーを保存しました",
			});

			const request = createMockRequest({
				provider: "google",
				apiKey: "test-api-key",
				test: false,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe("APIキーを保存しました");
			expect(saveAPIKey).toHaveBeenCalledWith("google", "test-api-key");
			expect(testAPIKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-002: APIキーの保存（テストあり）
	// ========================================
	describe("TC-002: Save API key with test", () => {
		it("should test API key before saving", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(testAPIKey).mockResolvedValue({
				success: true,
				message: "APIキーは有効です",
			});

			vi.mocked(saveAPIKey).mockResolvedValue({
				success: true,
				message: "APIキーを保存しました",
			});

			const request = createMockRequest({
				provider: "openai",
				apiKey: "test-api-key",
				test: true,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe("APIキーを保存しました");
			expect(testAPIKey).toHaveBeenCalledWith("openai", "test-api-key");
			expect(saveAPIKey).toHaveBeenCalledWith("openai", "test-api-key");
		});
	});

	// ========================================
	// TC-003: APIキーテスト失敗
	// ========================================
	describe("TC-003: API key test failure", () => {
		it("should return 400 when API key test fails", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(testAPIKey).mockResolvedValue({
				success: false,
				error: "APIキーが無効です",
			});

			const request = createMockRequest({
				provider: "google",
				apiKey: "invalid-key",
				test: true,
			});

			const response = await POST(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("APIキーが無効です");
			expect(saveAPIKey).not.toHaveBeenCalled();
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
			expect(saveAPIKey).not.toHaveBeenCalled();
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
			expect(saveAPIKey).not.toHaveBeenCalled();
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
			expect(saveAPIKey).not.toHaveBeenCalled();
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
			expect(saveAPIKey).not.toHaveBeenCalled();
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
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(deleteAPIKey).mockResolvedValue({
				success: true,
				message: "APIキーを削除しました",
			});

			const request = createMockRequest({
				provider: "google",
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.message).toBe("APIキーを削除しました");
			expect(deleteAPIKey).toHaveBeenCalledWith("google");
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
			expect(deleteAPIKey).not.toHaveBeenCalled();
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
			expect(deleteAPIKey).not.toHaveBeenCalled();
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
			expect(deleteAPIKey).not.toHaveBeenCalled();
		});
	});

	// ========================================
	// TC-005: 削除エラー
	// ========================================
	describe("TC-005: Delete error", () => {
		it("should return 400 when delete fails", async () => {
			vi.mocked(createClient).mockResolvedValue(
				createMockSupabaseClient() as never,
			);

			vi.mocked(deleteAPIKey).mockResolvedValue({
				success: false,
				error: "削除に失敗しました",
			});

			const request = createMockRequest({
				provider: "google",
			});

			const response = await DELETE(request);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.error).toBe("削除に失敗しました");
		});
	});
});

