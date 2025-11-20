/**
 * PDF Batch OCR Processing Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ components/batch/PdfBatchProcessor.tsx
 *   └─ app/(protected)/decks/[deckId]/pdf/_components/PdfCardGenerator.tsx
 *
 * Dependencies (依存先):
 *   ├─ app/api/batch/pdf/route.ts (API Route)
 *   └─ @tanstack/react-query (useMutation)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import type {
	BatchOcrResult,
	DualPdfOcrResult,
} from "@/app/_actions/pdfBatchOcr";

export interface UsePdfBatchProcessingOptions {
	onSuccess?: (result: BatchOcrResult | DualPdfOcrResult) => void;
	onError?: (error: Error) => void;
}

/**
 * PDFのバッチOCR処理フック（単一PDFモード）
 *
 * @param options - オプション
 * @returns バッチ処理のmutationオブジェクト
 */
export function usePdfBatchProcessing(
	options?: UsePdfBatchProcessingOptions,
) {
	return useMutation({
		mutationFn: async (
			imagePages: Array<{
				pageNumber: number;
				imageBlob: Blob;
			}>,
		): Promise<BatchOcrResult> => {
			// BlobをBase64に変換
			const imagePagesWithBase64 = await Promise.all(
				imagePages.map(async (page) => {
					const base64 = await blobToBase64(page.imageBlob);
					return {
						pageNumber: page.pageNumber,
						imageBlob: base64,
					};
				}),
			);

			const response = await fetch("/api/batch/pdf", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					mode: "single",
					imagePages: imagePagesWithBase64,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to process PDF batch OCR");
			}

			return response.json();
		},
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}

/**
 * PDFのバッチOCR処理フック（デュアルPDFモード）
 *
 * @param options - オプション
 * @returns バッチ処理のmutationオブジェクト
 */
export function useDualPdfBatchProcessing(
	options?: UsePdfBatchProcessingOptions,
) {
	return useMutation({
		mutationFn: async (params: {
			questionPages: Array<{
				pageNumber: number;
				imageBlob: Blob;
			}>;
			answerPages: Array<{
				pageNumber: number;
				imageBlob: Blob;
			}>;
		}): Promise<DualPdfOcrResult> => {
			// BlobをBase64に変換
			const questionPagesWithBase64 = await Promise.all(
				params.questionPages.map(async (page) => {
					const base64 = await blobToBase64(page.imageBlob);
					return {
						pageNumber: page.pageNumber,
						imageBlob: base64,
					};
				}),
			);

			const answerPagesWithBase64 = await Promise.all(
				params.answerPages.map(async (page) => {
					const base64 = await blobToBase64(page.imageBlob);
					return {
						pageNumber: page.pageNumber,
						imageBlob: base64,
					};
				}),
			);

			const response = await fetch("/api/batch/pdf", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					mode: "dual",
					questionPages: questionPagesWithBase64,
					answerPages: answerPagesWithBase64,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error || "Failed to process dual PDF batch OCR",
				);
			}

			return response.json();
		},
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}

/**
 * BlobをBase64文字列に変換
 */
function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
			} else {
				reject(new Error("Failed to convert blob to base64"));
			}
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
