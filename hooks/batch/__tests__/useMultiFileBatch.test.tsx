/**
 * Tests for useMultiFileBatch hook
 *
 * Related Files:
 * - Implementation: hooks/batch/useMultiFileBatch.ts
 * - API Route: app/api/batch/multi-file/route.ts
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMultiFileBatch } from "../useMultiFileBatch";

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

describe("useMultiFileBatch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should successfully process files using JSON", async () => {
		const mockResponse = {
			success: true,
			message: "Processed successfully",
			processedFiles: [
				{
					fileId: "file-1",
					fileName: "test.pdf",
					success: true,
					cards: [],
					extractedText: [],
					processingTimeMs: 1000,
				},
			],
			totalCards: 0,
			totalProcessingTimeMs: 1000,
			apiRequestsUsed: 1,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => useMultiFileBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
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
			"/api/batch/multi-file",
			expect.objectContaining({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			}),
		);
	});

	it("should successfully process files using FormData", async () => {
		const mockResponse = {
			success: true,
			message: "Processed successfully",
			processedFiles: [],
			totalCards: 0,
			totalProcessingTimeMs: 1000,
			apiRequestsUsed: 1,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => useMultiFileBatch(), {
			wrapper: createWrapper(),
		});

		const formData = new FormData();
		formData.append("file0", new Blob(["test"], { type: "application/pdf" }));

		result.current.mutate({ formData });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockResponse);
		expect(global.fetch).toHaveBeenCalledWith(
			"/api/batch/multi-file",
			expect.objectContaining({
				method: "POST",
			}),
		);
	});

	it("should handle API errors", async () => {
		const errorMessage = "Multi-file batch processing failed";
		(global.fetch as Mock).mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				error: "Internal server error",
				message: errorMessage,
			}),
		});

		const { result } = renderHook(() => useMultiFileBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			files: [
				{
					fileId: "file-1",
					fileName: "test.pdf",
					fileType: "pdf",
					fileBlob: "data:application/pdf;base64,test",
				},
			],
		});

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeInstanceOf(Error);
		expect((result.current.error as Error).message).toBe(errorMessage);
	});

	it("should throw error if neither files nor formData is provided", async () => {
		const { result } = renderHook(() => useMultiFileBatch(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({} as any);

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBeInstanceOf(Error);
		expect((result.current.error as Error).message).toContain("files or formData");
	});

	it("should call onSuccess callback", async () => {
		const mockResponse = {
			success: true,
			message: "Success",
			processedFiles: [],
			totalCards: 0,
			totalProcessingTimeMs: 1000,
			apiRequestsUsed: 1,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const onSuccess = vi.fn();
		const { result } = renderHook(() => useMultiFileBatch({ onSuccess }), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
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

