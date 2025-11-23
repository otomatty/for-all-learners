/**
 * Custom Hook: useMultiFileBatch
 *
 * Multi-file batch processing
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this hook):
 *   ├─ (To be updated after migration)
 *
 * Dependencies (External files that this hook uses):
 *   ├─ @tanstack/react-query (useMutation)
 *   └─ hooks/utils/apiUtils (handleApiError)
 *
 * Related Documentation:
 *   ├─ API Route: app/api/batch/multi-file/route.ts
 *   ├─ Tests: hooks/batch/__tests__/useMultiFileBatch.test.tsx
 *   ├─ Original Server Action: app/_actions/multiFileBatchProcessing.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import { handleApiError } from "../utils/apiUtils";

export interface MultiFileInput {
	fileId: string;
	fileName: string;
	fileType: "pdf" | "image" | "audio";
	fileBlob: string; // base64 encoded
	metadata?: {
		isQuestion?: boolean;
		isAnswer?: boolean;
		priority?: number;
	};
}

export interface MultiFileProcessingResult {
	success: boolean;
	message: string;
	processedFiles: Array<{
		fileId: string;
		fileName: string;
		success: boolean;
		cards?: unknown[];
		extractedText?: Array<{ pageNumber: number; text: string }>;
		error?: string;
		processingTimeMs?: number;
	}>;
	totalCards: number;
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
}

export interface UseMultiFileBatchOptions {
	onSuccess?: (result: MultiFileProcessingResult) => void;
	onError?: (error: Error) => void;
}

/**
 * Hook for multi-file batch processing
 *
 * @param options - Configuration options
 * @returns Mutation hook for multi-file batch processing
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useMultiFileBatch({
 *   onSuccess: (result) => {
 *     console.log(`Processed ${result.totalCards} cards from ${result.processedFiles.length} files`);
 *   },
 * });
 *
 * // Process files using JSON (base64)
 * mutate({
 *   files: [
 *     {
 *       fileId: "file-1",
 *       fileName: "document.pdf",
 *       fileType: "pdf",
 *       fileBlob: "data:application/pdf;base64,...",
 *     },
 *   ],
 * });
 *
 * // Process files using FormData
 * const formData = new FormData();
 * formData.append("file0", fileBlob);
 * formData.append("file0_id", "file-1");
 * formData.append("file0_type", "pdf");
 * mutate({ formData });
 * ```
 */
export function useMultiFileBatch(options?: UseMultiFileBatchOptions) {
	return useMutation({
		mutationFn: async (params: {
			files?: MultiFileInput[];
			formData?: FormData;
		}): Promise<MultiFileProcessingResult> => {
			let response: Response;

			if (params.formData) {
				// Use FormData
				response = await fetch("/api/batch/multi-file", {
					method: "POST",
					body: params.formData,
				});
			} else if (params.files) {
				// Use JSON
				response = await fetch("/api/batch/multi-file", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						files: params.files,
					}),
				});
			} else {
				throw new Error("Either files or formData must be provided");
			}

			if (!response.ok) {
				await handleApiError(response, "Multi-file batch processing failed");
			}

			return await response.json();
		},
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}
