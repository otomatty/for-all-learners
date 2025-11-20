/**
 * useImageBatchOcr Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this hook):
 *   └─ (作成予定: 画像バッチOCRを使用するコンポーネント)
 *
 * Dependencies (External files that this hook imports):
 *   ├─ @tanstack/react-query (useMutation)
 *   └─ app/api/batch/image-ocr/route.ts (API Route)
 *
 * Related Documentation:
 *   ├─ Spec: ./useImageBatchOcr.spec.md (作成予定)
 *   ├─ Tests: ./__tests__/useImageBatchOcr.test.ts (作成予定)
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

export function useImageBatchOcr() {
	return useMutation({
		mutationFn: async (params: {
			pages: BatchOcrPage[];
			batchSize?: number;
		}): Promise<BatchOcrResult> => {
			const response = await fetch("/api/batch/image-ocr", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					pages: params.pages,
					batchSize: params.batchSize || 4,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Image batch OCR failed");
			}

			return response.json();
		},
	});
}
