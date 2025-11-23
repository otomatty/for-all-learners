/**
 * Tests for useGeneratePageInfo hook
 *
 * Test Coverage:
 * - TC-001: 正常系 - ページ情報生成成功
 * - TC-002: 異常系 - APIエラー
 * - TC-003: 異常系 - ネットワークエラー
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useGeneratePageInfo } from "../useGeneratePageInfo";

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

describe("useGeneratePageInfo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// TC-001: 正常系 - ページ情報生成成功
	test("TC-001: Should generate page info successfully", async () => {
		const mockMarkdown = "# React Hooks\n\nReact Hooksは...";

		vi.mocked(fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ markdown: mockMarkdown }),
		} as Response);

		const { result } = renderHook(() => useGeneratePageInfo(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;
		const response = await mutation.mutateAsync({
			title: "React Hooks",
		});

		await waitFor(() => {
			expect(response.markdown).toBe(mockMarkdown);
		});

		expect(fetch).toHaveBeenCalledWith("/api/ai/generate-page-info", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title: "React Hooks",
			}),
		});
	});

	// TC-002: 異常系 - APIエラー
	test("TC-002: Should handle API error", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 400,
			json: async () => ({ error: "titleは必須です" }),
		} as Response);

		const { result } = renderHook(() => useGeneratePageInfo(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				title: "",
			}),
		).rejects.toThrow("titleは必須です");
	});

	// TC-003: 異常系 - ネットワークエラー
	test("TC-003: Should handle network error", async () => {
		vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useGeneratePageInfo(), {
			wrapper: createWrapper(),
		});

		const mutation = result.current;

		await expect(
			mutation.mutateAsync({
				title: "Title",
			}),
		).rejects.toThrow("Network error");
	});
});

