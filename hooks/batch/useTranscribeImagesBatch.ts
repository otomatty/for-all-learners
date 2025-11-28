/**
 * Custom Hook: useTranscribeImagesBatch
 *
 * Batch OCR processing for multiple images
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this hook):
 *   ├─ (None - to be integrated)
 *
 * Dependencies (External files that this hook uses):
 *   ├─ @tanstack/react-query (useMutation)
 *
 * Related Documentation:
 *   ├─ API Route: app/api/batch/image/ocr/route.ts
 *   ├─ Tests: hooks/batch/__tests__/useTranscribeImagesBatch.test.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

"use client";

import { useMutation } from "@tanstack/react-query";

export interface BatchOcrPage {
	pageNumber: number;
	imageUrl: string;
}

export interface BatchOcrResult {
	success: boolean;
	message: string;
	extractedPages?: Array<{ pageNumber: number; text: string }>;
	error?: string;
	processedCount?: number;
	skippedCount?: number;
}

export interface UseTranscribeImagesBatchOptions {
	batchSize?: number;
	onSuccess?: (result: BatchOcrResult) => void;
	onError?: (error: Error) => void;
}

/**
 * Hook for batch OCR processing of multiple images
 *
 * @param options - Configuration options
 * @returns Mutation hook for batch OCR processing
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useTranscribeImagesBatch({
 *   batchSize: 4,
 *   onSuccess: (result) => {
 *     console.log(`Processed ${result.processedCount} pages`);
 *   },
 * });
 *
 * // Process images
 * mutate({
 *   pages: [
 *     { pageNumber: 1, imageUrl: "https://example.com/page1.png" },
 *     { pageNumber: 2, imageUrl: "https://example.com/page2.png" },
 *   ],
 * });
 * ```
 */
export function useTranscribeImagesBatch(
	options?: UseTranscribeImagesBatchOptions,
) {
	return useMutation({
		mutationFn: async (params: {
			pages: BatchOcrPage[];
			batchSize?: number;
		}): Promise<BatchOcrResult> => {
			const batchSize = params.batchSize || options?.batchSize || 4;

			const response = await fetch("/api/batch/image/ocr", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					pages: params.pages,
					batchSize,
				}),
			});

			if (!response.ok) {
				let errorMessage = "バッチOCR処理に失敗しました";
				try {
					const errorData = await response.json();
					errorMessage = errorData.message || errorMessage;
				} catch {
					// Response is not valid JSON, use default message
				}
				throw new Error(errorMessage);
			}

			return await response.json();
		},
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}
