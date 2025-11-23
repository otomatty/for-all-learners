/**
 * Tests for useAPIKey hooks
 *
 * Test Coverage:
 * - useAPIKeyStatus: TC-001-003
 * - useSaveAPIKey: TC-004-006
 * - useDeleteAPIKey: TC-007-009
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
	useAPIKeyStatus,
	useSaveAPIKey,
	useDeleteAPIKey,
} from "../useAPIKey";

// Helper to create test wrapper
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

// Mock fetch
global.fetch = vi.fn();

describe("useAPIKeyStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - APIキー状態取得成功
	test("TC-001: Should get API key status successfully", async () => {
		const mockStatus = {
			google: { configured: true, updatedAt: "2025-01-01T00:00:00Z" },
			openai: { configured: false, updatedAt: null },
			anthropic: { configured: false, updatedAt: null },
		};

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ data: mockStatus }),
		} as Response);

		const { result } = renderHook(() => useAPIKeyStatus(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data?.data).toEqual(mockStatus);
		expect(fetch).toHaveBeenCalledWith("/api/ai/api-key", {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});
	});

	// TC-002: 異常系 - APIエラー
	test("TC-002: Should handle API error", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({ error: "データベースエラー" }),
		} as Response);

		const { result } = renderHook(() => useAPIKeyStatus(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error?.message).toContain("データベースエラー");
	});

	// TC-003: 異常系 - ネットワークエラー
	test("TC-003: Should handle network error", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useAPIKeyStatus(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error?.message).toBe("Network error");
	});
});

describe("useSaveAPIKey", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-004: 正常系 - APIキー保存成功
	test("TC-004: Should save API key successfully", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ message: "APIキーを保存しました" }),
		} as Response);

		const { result } = renderHook(() => useSaveAPIKey(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const response = await mutation.mutateAsync({
			provider: "google",
			apiKey: "test-api-key",
		});

		await waitFor(() => {
			expect(response.message).toBe("APIキーを保存しました");
		});

		expect(fetch).toHaveBeenCalledWith("/api/ai/api-key", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				provider: "google",
				apiKey: "test-api-key",
			}),
		});
	});

	// TC-005: 異常系 - APIエラー
	test("TC-005: Should handle API error", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ error: "apiKeyは必須です" }),
		} as Response);

		const { result } = renderHook(() => useSaveAPIKey(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				provider: "google",
				apiKey: "",
			}),
		).rejects.toThrow("apiKeyは必須です");
	});

	// TC-006: 異常系 - ネットワークエラー
	test("TC-006: Should handle network error", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useSaveAPIKey(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				provider: "google",
				apiKey: "test-api-key",
			}),
		).rejects.toThrow("Network error");
	});
});

describe("useDeleteAPIKey", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-007: 正常系 - APIキー削除成功
	test("TC-007: Should delete API key successfully", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ message: "APIキーを削除しました" }),
		} as Response);

		const { result } = renderHook(() => useDeleteAPIKey(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const response = await mutation.mutateAsync({
			provider: "google",
		});

		await waitFor(() => {
			expect(response.message).toBe("APIキーを削除しました");
		});

		expect(fetch).toHaveBeenCalledWith("/api/ai/api-key", {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				provider: "google",
			}),
		});
	});

	// TC-008: 異常系 - APIエラー
	test("TC-008: Should handle API error", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ error: "providerは必須です" }),
		} as Response);

		const { result } = renderHook(() => useDeleteAPIKey(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				provider: "google" as never,
			}),
		).rejects.toThrow("providerは必須です");
	});

	// TC-009: 異常系 - ネットワークエラー
	test("TC-009: Should handle network error", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useDeleteAPIKey(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				provider: "google",
			}),
		).rejects.toThrow("Network error");
	});
});

