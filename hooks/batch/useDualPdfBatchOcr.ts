/**
 * Custom Hook: useDualPdfBatchOcr
 * 
 * Dual PDF batch OCR processing (question + answer PDFs)
 * 
 * DEPENDENCY MAP:
 * 
 * Parents (Files that import this hook):
 *   ├─ hooks/use-pdf-processing.ts
 *   ├─ (To be updated after migration)
 * 
 * Dependencies (External files that this hook uses):
 *   ├─ @tanstack/react-query (useMutation)
 * 
 * Related Documentation:
 *   ├─ API Route: app/api/batch/pdf/dual-ocr/route.ts
 *   ├─ Tests: hooks/batch/__tests__/useDualPdfBatchOcr.test.tsx
 *   ├─ Original Server Action: app/_actions/pdfBatchOcr.ts (processDualPdfBatchOcr)
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

"use client";

import { useMutation } from "@tanstack/react-query";

export interface DualPdfImagePage {
	pageNumber: number;
	imageBlob: string; // base64 encoded
}

export interface DualPdfBatchOcrResult {
	success: boolean;
	message: string;
	extractedText?: Array<{
		pageNumber: number;
		questionText: string;
		answerText: string;
		explanationText?: string;
	}>;
	processingTimeMs?: number;
}

export interface UseDualPdfBatchOcrOptions {
	onSuccess?: (result: DualPdfBatchOcrResult) => void;
	onError?: (error: Error) => void;
}

/**
 * Hook for dual PDF batch OCR processing
 * 
 * @param options - Configuration options
 * @returns Mutation hook for dual PDF batch OCR
 * 
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useDualPdfBatchOcr({
 *   onSuccess: (result) => {
 *     console.log(`Generated ${result.extractedText?.length} Q&A sets`);
 *   },
 * });
 * 
 * // Process question and answer PDFs
 * mutate({
 *   questionPages: [
 *     { pageNumber: 1, imageBlob: "data:image/png;base64,..." },
 *   ],
 *   answerPages: [
 *     { pageNumber: 1, imageBlob: "data:image/png;base64,..." },
 *   ],
 * });
 * ```
 */
export function useDualPdfBatchOcr(options?: UseDualPdfBatchOcrOptions) {
	return useMutation({
		mutationFn: async (params: {
			questionPages: DualPdfImagePage[];
			answerPages: DualPdfImagePage[];
		}): Promise<DualPdfBatchOcrResult> => {
			const response = await fetch("/api/batch/pdf/dual-ocr", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					questionPages: params.questionPages,
					answerPages: params.answerPages,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || "Dual PDF batch OCR processing failed",
				);
			}

			return await response.json();
		},
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}
