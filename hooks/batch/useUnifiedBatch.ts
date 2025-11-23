/**
 * Custom Hook: useUnifiedBatch
 *
 * Unified batch processing for multiple file types
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this hook):
 *   ├─ (To be updated after migration)
 *
 * Dependencies (External files that this hook uses):
 *   ├─ @tanstack/react-query (useMutation)
 *
 * Related Documentation:
 *   ├─ API Route: app/api/batch/unified/route.ts
 *   ├─ Tests: hooks/batch/__tests__/useUnifiedBatch.test.tsx
 *   ├─ Original Server Action: app/_actions/unifiedBatchProcessor.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

"use client";

import { useMutation } from "@tanstack/react-query";

// Type definitions from Server Actions
export type UnifiedBatchInput =
	| {
			type: "multi-file";
			files: Array<{
				fileId: string;
				fileName: string;
				fileType: "pdf" | "image" | "audio";
				fileBlob: string; // base64 encoded
				metadata?: {
					isQuestion?: boolean;
					isAnswer?: boolean;
					priority?: number;
				};
			}>;
	  }
	| {
			type: "audio-batch";
			audioFiles: Array<{
				audioId: string;
				audioName: string;
				audioBlob: string; // base64 encoded
				metadata?: {
					duration?: number;
					language?: string;
					priority?: number;
				};
			}>;
	  }
	| {
			type: "image-batch";
			pages: Array<{ pageNumber: number; imageUrl: string }>;
	  };

export interface UnifiedBatchResult {
	success: boolean;
	message: string;
	batchType: "multi-file" | "audio-batch" | "image-batch";
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
	quotaStatus: {
		remaining: number;
		used: number;
		limit: number;
	};
	multiFileResult?: {
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
	};
	audioBatchResult?: {
		success: boolean;
		message: string;
		transcriptions: Array<{
			audioId: string;
			audioName: string;
			success: boolean;
			transcript?: string;
			cards?: unknown[];
			error?: string;
			processingTimeMs?: number;
		}>;
		totalCards: number;
		totalProcessingTimeMs: number;
		apiRequestsUsed: number;
	};
	imageBatchResult?: {
		success: boolean;
		message: string;
		extractedPages?: Array<{ pageNumber: number; text: string }>;
		error?: string;
		processedCount?: number;
		skippedCount?: number;
	};
}

export interface UseUnifiedBatchOptions {
	onSuccess?: (result: UnifiedBatchResult) => void;
	onError?: (error: Error) => void;
}

/**
 * Hook for unified batch processing
 *
 * @param options - Configuration options
 * @returns Mutation hook for unified batch processing
 *
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useUnifiedBatch({
 *   onSuccess: (result) => {
 *     console.log(`Processed ${result.batchType} batch`);
 *   },
 * });
 *
 * // Process multi-file batch
 * mutate({
 *   type: "multi-file",
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
 * // Process audio batch
 * mutate({
 *   type: "audio-batch",
 *   audioFiles: [
 *     {
 *       audioId: "audio-1",
 *       audioName: "lecture.mp3",
 *       audioBlob: "data:audio/mp3;base64,...",
 *     },
 *   ],
 * });
 *
 * // Process image batch
 * mutate({
 *   type: "image-batch",
 *   pages: [
 *     { pageNumber: 1, imageUrl: "https://..." },
 *   ],
 * });
 * ```
 */
export function useUnifiedBatch(options?: UseUnifiedBatchOptions) {
	return useMutation({
		mutationFn: async (
			input: UnifiedBatchInput,
		): Promise<UnifiedBatchResult> => {
			const response = await fetch("/api/batch/unified", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					batchType: input.type,
					files: input.type === "multi-file" ? input.files : undefined,
					audioFiles: input.type === "audio-batch" ? input.audioFiles : undefined,
					pages: input.type === "image-batch" ? input.pages : undefined,
				}),
			});

			if (!response.ok) {
				let errorMessage = "Unified batch processing failed";
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

