/**
 * Tests for usePdfBatchOcr hook
 *
 * Related Files:
 * - Implementation: hooks/batch/usePdfBatchOcr.ts
 * - API Route: app/api/batch/pdf/ocr/route.ts
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePdfBatchOcr } from "../usePdfBatchOcr";

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("usePdfBatchOcr", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should successfully process PDF batch OCR", async () => {
		const mockResponse = {
			success: true,
			message: "バッチOCRで2/2ページからテキストを抽出しました",
			extractedText: [
				{ pageNumber: 1, text: "Page 1 text" },
				{ pageNumber: 2, text: "Page 2 text" },
			],
			processingTimeMs: 1000,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => usePdfBatchOcr(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			imagePages: [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,test1" },
				{ pageNumber: 2, imageBlob: "data:image/png;base64,test2" },
			],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockResponse);
		expect(global.fetch).toHaveBeenCalledWith(
			"/api/batch/pdf/ocr",
			expect.objectContaining({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			}),
		);
	});

	it("should handle API errors", async () => {
		const errorMessage = "PDF batch OCR processing failed";
		(global.fetch as Mock).mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				error: "Internal server error",
				message: errorMessage,
			}),
		});

		const { result } = renderHook(() => usePdfBatchOcr(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			imagePages: [{ pageNumber: 1, imageBlob: "data:image/png;base64,test" }],
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeInstanceOf(Error);
		expect((result.current.error as Error).message).toBe(errorMessage);
	});

	it("should call onSuccess callback", async () => {
		const mockResponse = {
			success: true,
			message: "Success",
			extractedText: [{ pageNumber: 1, text: "Test" }],
			processingTimeMs: 500,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const onSuccess = vi.fn();
		const { result } = renderHook(() => usePdfBatchOcr({ onSuccess }), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			imagePages: [{ pageNumber: 1, imageBlob: "data:image/png;base64,test" }],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		expect(onSuccess.mock.calls[0][0]).toEqual(mockResponse);
	});

	it("should call onError callback", async () => {
		(global.fetch as Mock).mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: "Error", message: "Test error" }),
		});

		const onError = vi.fn();
		const { result } = renderHook(() => usePdfBatchOcr({ onError }), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			imagePages: [{ pageNumber: 1, imageBlob: "data:image/png;base64,test" }],
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(onError).toHaveBeenCalled();
		expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
	});
});
