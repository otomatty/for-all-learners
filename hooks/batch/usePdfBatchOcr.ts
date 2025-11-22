/**
 * Custom Hook: usePdfBatchOcr
 *
 * Single PDF batch OCR processing
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
 *   ├─ API Route: app/api/batch/pdf/ocr/route.ts
 *   ├─ Tests: hooks/batch/__tests__/usePdfBatchOcr.test.tsx
 *   ├─ Original Server Action: app/_actions/pdfBatchOcr.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

"use client";

import { useMutation } from "@tanstack/react-query";

export interface PdfOcrImagePage {
	pageNumber: number;
	imageBlob: string; // base64 encoded
}

export interface PdfBatchOcrResult {
	success: boolean;
	message: string;
	extractedText?: Array<{ pageNumber: number; text: string }>;
	processingTimeMs?: number;
}

export interface UsePdfBatchOcrOptions {
	onSuccess?: (result: PdfBatchOcrResult) => void;
	onError?: (error: Error) => void;
}

/**
 * Hook for single PDF batch OCR processing
 *
 * @param options - Configuration options
 * @returns Mutation hook for PDF batch OCR
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = usePdfBatchOcr({
 *   onSuccess: (result) => {
 *     console.log(`Extracted ${result.extractedText?.length} pages`);
 *   },
 * });
 *
 * // Process PDF images
 * mutate({
 *   imagePages: [
 *     { pageNumber: 1, imageBlob: "data:image/png;base64,..." },
 *     { pageNumber: 2, imageBlob: "data:image/png;base64,..." },
 *   ],
 * });
 * ```
 */
export function usePdfBatchOcr(options?: UsePdfBatchOcrOptions) {
	return useMutation({
		mutationFn: async (params: {
			imagePages: PdfOcrImagePage[];
		}): Promise<PdfBatchOcrResult> => {
			const response = await fetch("/api/batch/pdf/ocr", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					imagePages: params.imagePages,
				}),
			});

			if (!response.ok) {
				let errorMessage = "PDF batch OCR processing failed";
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
