/**
 * Tests for useTranscribeImagesBatch hook
 *
 * Related Files:
 * - Implementation: hooks/batch/useTranscribeImagesBatch.ts
 * - API Route: app/api/batch/image/ocr/route.ts
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTranscribeImagesBatch } from "../useTranscribeImagesBatch";

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

describe("useTranscribeImagesBatch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should successfully process batch OCR", async () => {
		const mockResponse = {
			success: true,
			message: "バッチOCR処理完了: 2/2ページ処理成功",
			extractedPages: [
				{ pageNumber: 1, text: "Extracted text 1" },
				{ pageNumber: 2, text: "Extracted text 2" },
			],
			processedCount: 2,
			skippedCount: 0,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => useTranscribeImagesBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			pages: [
				{ pageNumber: 1, imageUrl: "https://example.com/page1.png" },
				{ pageNumber: 2, imageUrl: "https://example.com/page2.png" },
			],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockResponse);
		expect(global.fetch).toHaveBeenCalledWith(
			"/api/batch/image/ocr",
			expect.objectContaining({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			}),
		);
	});

	it("should handle custom batch size", async () => {
		const mockResponse = {
			success: true,
			message: "Success",
			extractedPages: [],
			processedCount: 0,
			skippedCount: 0,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(
			() => useTranscribeImagesBatch({ batchSize: 2 }),
			{
				wrapper: createWrapper(),
			},
		);

		result.current.mutate({
			pages: [{ pageNumber: 1, imageUrl: "https://example.com/page1.png" }],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const fetchCall = (global.fetch as Mock).mock.calls[0];
		const requestBody = JSON.parse(fetchCall[1].body);
		expect(requestBody.batchSize).toBe(2);
	});

	it("should override hook-level batch size with mutation-level batch size", async () => {
		const mockResponse = {
			success: true,
			message: "Success",
			extractedPages: [],
			processedCount: 0,
			skippedCount: 0,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(
			() => useTranscribeImagesBatch({ batchSize: 2 }),
			{
				wrapper: createWrapper(),
			},
		);

		result.current.mutate({
			pages: [{ pageNumber: 1, imageUrl: "https://example.com/page1.png" }],
			batchSize: 6, // Override hook-level batchSize
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const fetchCall = (global.fetch as Mock).mock.calls[0];
		const requestBody = JSON.parse(fetchCall[1].body);
		expect(requestBody.batchSize).toBe(6);
	});

	it("should handle API errors", async () => {
		const errorMessage = "バッチOCR処理に失敗しました";
		(global.fetch as Mock).mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				error: "Internal server error",
				message: errorMessage,
			}),
		});

		const { result } = renderHook(() => useTranscribeImagesBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			pages: [{ pageNumber: 1, imageUrl: "https://example.com/page1.png" }],
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeInstanceOf(Error);
		expect((result.current.error as Error).message).toBe(errorMessage);
	});

	it("should call onSuccess callback", async () => {
		const mockResponse = {
			success: true,
			message: "Success",
			extractedPages: [{ pageNumber: 1, text: "Test" }],
			processedCount: 1,
			skippedCount: 0,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const onSuccess = vi.fn();
		const { result } = renderHook(
			() => useTranscribeImagesBatch({ onSuccess }),
			{
				wrapper: createWrapper(),
			},
		);

		result.current.mutate({
			pages: [{ pageNumber: 1, imageUrl: "https://example.com/page1.png" }],
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
		const { result } = renderHook(() => useTranscribeImagesBatch({ onError }), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			pages: [{ pageNumber: 1, imageUrl: "https://example.com/page1.png" }],
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(onError).toHaveBeenCalled();
		expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
	});

	it("should handle network errors", async () => {
		(global.fetch as Mock).mockRejectedValueOnce(new Error("Network error"));

		const { result } = renderHook(() => useTranscribeImagesBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			pages: [{ pageNumber: 1, imageUrl: "https://example.com/page1.png" }],
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeInstanceOf(Error);
		expect((result.current.error as Error).message).toBe("Network error");
	});
});
