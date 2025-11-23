/**
 * Tests for useGenerateTitle hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - タイトル生成成功
 * - TC-002: 異常系 - APIエラー
 * - TC-003: 異常系 - ネットワークエラー
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useGenerateTitle } from "../useGenerateTitle";

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

describe("useGenerateTitle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - タイトル生成成功
	test("TC-001: Should generate title successfully", async () => {
		const mockTitle = "React Hooks入門";

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ title: mockTitle }),
		} as Response);

		const { result } = renderHook(() => useGenerateTitle(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const response = await mutation.mutateAsync({
			transcript: "React Hooksについて説明します...",
		});

		await waitFor(() => {
			expect(response.title).toBe(mockTitle);
		});

		expect(fetch).toHaveBeenCalledWith("/api/ai/generate-title", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				transcript: "React Hooksについて説明します...",
			}),
		});
	});

	// TC-002: 異常系 - APIエラー
	test("TC-002: Should handle API error", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ error: "transcriptは必須です" }),
		} as Response);

		const { result } = renderHook(() => useGenerateTitle(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				transcript: "",
			}),
		).rejects.toThrow("transcriptは必須です");
	});

	// TC-003: 異常系 - ネットワークエラー
	test("TC-003: Should handle network error", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useGenerateTitle(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				transcript: "Transcript text",
			}),
		).rejects.toThrow("Network error");
	});
});

