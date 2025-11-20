/**
 * Multi-File Batch Processing Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ components/batch/MultiFileBatchProcessor.tsx
 *   └─ app/(protected)/decks/[deckId]/_components/MultiFileUploader.tsx
 *
 * Dependencies (依存先):
 *   ├─ app/api/batch/multi-file/route.ts (API Route)
 *   └─ @tanstack/react-query (useMutation)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import type {
	MultiFileInput,
	MultiFileProcessingResult,
} from "@/app/_actions/multiFileBatchProcessing";

export interface UseMultiFileBatchProcessingOptions {
	onSuccess?: (result: MultiFileProcessingResult) => void;
	onError?: (error: Error) => void;
}

/**
 * 複数ファイルのバッチ処理フック
 *
 * @param options - オプション
 * @returns バッチ処理のmutationオブジェクト
 */
export function useMultiFileBatchProcessing(
	options?: UseMultiFileBatchProcessingOptions,
) {
	return useMutation({
		mutationFn: async (
			files: MultiFileInput[],
		): Promise<MultiFileProcessingResult> => {
			// BlobをBase64に変換
			const filesWithBase64 = await Promise.all(
				files.map(async (file) => {
					const base64 = await blobToBase64(file.fileBlob);
					return {
						fileId: file.fileId,
						fileName: file.fileName,
						fileType: file.fileType,
						fileBlob: base64,
						metadata: file.metadata,
					};
				}),
			);

			const response = await fetch("/api/batch/multi-file", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					files: filesWithBase64,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					error.error || "Failed to process multi-file batch",
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
