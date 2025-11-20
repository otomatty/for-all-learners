/**
 * Tests for useDualPdfBatchOcr hook
 *
 * Related Files:
 * - Implementation: hooks/batch/useDualPdfBatchOcr.ts
 * - API Route: app/api/batch/pdf/dual-ocr/route.ts
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDualPdfBatchOcr } from "../useDualPdfBatchOcr";

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

describe("useDualPdfBatchOcr", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("should successfully process dual PDF batch OCR", async () => {
		const mockResponse = {
			success: true,
			message:
				"デュアルPDF処理で1個の詳細な問題・解答・解説セットを生成しました",
			extractedText: [
				{
					pageNumber: 1,
					questionText: "What is 2+2?",
					answerText: "4",
					explanationText: "2+2=4 because...",
				},
			],
			processingTimeMs: 2000,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const { result } = renderHook(() => useDualPdfBatchOcr(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			questionPages: [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,question" },
			],
			answerPages: [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,answer" },
			],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockResponse);
		expect(global.fetch).toHaveBeenCalledWith(
			"/api/batch/pdf/dual-ocr",
			expect.objectContaining({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			}),
		);
	});

	it("should handle API errors", async () => {
		const errorMessage = "Dual PDF batch OCR processing failed";
		(global.fetch as Mock).mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				error: "Internal server error",
				message: errorMessage,
			}),
		});

		const { result } = renderHook(() => useDualPdfBatchOcr(), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			questionPages: [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,question" },
			],
			answerPages: [
				{ pageNumber: 1, imageBlob: "data:image/png;base64,answer" },
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
			extractedText: [
				{
					pageNumber: 1,
					questionText: "Q",
					answerText: "A",
					explanationText: "E",
				},
			],
			processingTimeMs: 1500,
		};

		(global.fetch as Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse,
		});

		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDualPdfBatchOcr({ onSuccess }), {
			wrapper: createWrapper(),
		});

		result.current.mutate({
			questionPages: [{ pageNumber: 1, imageBlob: "data:image/png;base64,q" }],
			answerPages: [{ pageNumber: 1, imageBlob: "data:image/png;base64,a" }],
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		expect(onSuccess.mock.calls[0][0]).toEqual(mockResponse);
	});
});
