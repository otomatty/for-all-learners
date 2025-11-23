/**
 * Tests for useUnifiedBatch hook
 *
 * Related Files:
 * - Implementation: hooks/batch/useUnifiedBatch.ts
 * - API Route: app/api/batch/unified/route.ts
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnifiedBatch } from "../useUnifiedBatch";

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

describe("useUnifiedBatch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should successfully process multi-file batch", async () => {
		const mockResponse = {
			success: true,
			message: "Processed successfully",
			batchType: "multi-file" as const,
			totalProcessingTimeMs: 1000,
			apiRequestsUsed: 1,
			quotaStatus: {
				remaining: 99,
				used: 1,
				limit: 100,
			},
			multiFileResult: {
				success: true,
				message: "Processed successfully",
				processedFiles: [],
				totalCards: 0,
				totalProcessingTimeMs: 1000,
				apiRequestsUsed: 1,
			},
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => useUnifiedBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			type: "multi-file",
			files: [
				{
					fileId: "file-1",
					fileName: "test.pdf",
					fileType: "pdf",
					fileBlob: "data:application/pdf;base64,test",
				},
			],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockResponse);
		expect(global.fetch).toHaveBeenCalledWith(
			"/api/batch/unified",
			expect.objectContaining({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			}),
		);
	});

	it("should successfully process audio-batch", async () => {
		const mockResponse = {
			success: true,
			message: "Processed successfully",
			batchType: "audio-batch" as const,
			totalProcessingTimeMs: 1000,
			apiRequestsUsed: 1,
			quotaStatus: {
				remaining: 99,
				used: 1,
				limit: 100,
			},
			audioBatchResult: {
				success: true,
				message: "Processed successfully",
				transcriptions: [],
				totalCards: 0,
				totalProcessingTimeMs: 1000,
				apiRequestsUsed: 1,
			},
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => useUnifiedBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			type: "audio-batch",
			audioFiles: [
				{
					audioId: "audio-1",
					audioName: "test.mp3",
					audioBlob: "data:audio/mp3;base64,test",
				},
			],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockResponse);
	});

	it("should successfully process image-batch", async () => {
		const mockResponse = {
			success: true,
			message: "Processed successfully",
			batchType: "image-batch" as const,
			totalProcessingTimeMs: 1000,
			apiRequestsUsed: 1,
			quotaStatus: {
				remaining: 99,
				used: 1,
				limit: 100,
			},
			imageBatchResult: {
				success: true,
				message: "Processed successfully",
				extractedPages: [],
			},
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => useUnifiedBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			type: "image-batch",
			pages: [
				{
					pageNumber: 1,
					imageUrl: "https://example.com/image.png",
				},
			],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockResponse);
	});

	it("should handle API errors", async () => {
		const errorMessage = "Unified batch processing failed";
		(global.fetch as Mock).mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				error: "Internal server error",
				message: errorMessage,
			}),
		});

		const { result } = renderHook(() => useUnifiedBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			type: "image-batch",
			pages: [
				{
					pageNumber: 1,
					imageUrl: "https://example.com/image.png",
				},
			],
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeInstanceOf(Error);
		expect((result.current.error as Error).message).toBe(errorMessage);
	});

	it("should call onSuccess callback", async () => {
		const mockResponse = {
			success: true,
			message: "Success",
			batchType: "multi-file" as const,
			totalProcessingTimeMs: 1000,
			apiRequestsUsed: 1,
			quotaStatus: {
				remaining: 99,
				used: 1,
				limit: 100,
			},
			multiFileResult: {
				success: true,
				message: "Success",
				processedFiles: [],
				totalCards: 0,
				totalProcessingTimeMs: 1000,
				apiRequestsUsed: 1,
			},
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUnifiedBatch({ onSuccess }), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			type: "multi-file",
			files: [
				{
					fileId: "file-1",
					fileName: "test.pdf",
					fileType: "pdf",
					fileBlob: "data:application/pdf;base64,test",
				},
			],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		expect(onSuccess.mock.calls[0][0]).toEqual(mockResponse);
	});
});

