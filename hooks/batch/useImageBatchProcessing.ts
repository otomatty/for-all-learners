/**
 * Image Batch OCR Processing Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ components/batch/ImageBatchProcessor.tsx
 *   └─ app/(protected)/decks/[deckId]/ocr/_components/ImageCardGenerator.tsx
 *
 * Dependencies (依存先):
 *   ├─ app/api/batch/images/route.ts (API Route)
 *   └─ @tanstack/react-query (useMutation)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import type {
	BatchOcrPage,
	BatchOcrResult,
} from "@/app/_actions/transcribeImageBatch";

export interface UseImageBatchProcessingOptions {
	onSuccess?: (result: BatchOcrResult) => void;
	onError?: (error: Error) => void;
}

/**
 * 画像のバッチOCR処理フック
 *
 * @param options - オプション
 * @returns バッチ処理のmutationオブジェクト
 */
export function useImageBatchProcessing(
	options?: UseImageBatchProcessingOptions,
) {
	return useMutation({
		mutationFn: async (
			params: {
				pages: BatchOcrPage[];
				batchSize?: number;
			},
		): Promise<BatchOcrResult> => {
			const response = await fetch("/api/batch/images", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					pages: params.pages,
					batchSize: params.batchSize,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to process image batch OCR");
			}

			return response.json();
		},
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}
