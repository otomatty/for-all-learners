/**
 * Unified Batch Processing Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ components/batch/UnifiedBatchProcessor.tsx
 *   └─ app/(protected)/decks/[deckId]/_components/BatchFileUploader.tsx
 *
 * Dependencies (依存先):
 *   ├─ app/api/batch/unified/route.ts (API Route)
 *   └─ @tanstack/react-query (useMutation)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import type {
	UnifiedBatchInput,
	UnifiedBatchResult,
} from "@/app/_actions/unifiedBatchProcessor";

export interface UseUnifiedBatchProcessingOptions {
	onSuccess?: (result: UnifiedBatchResult) => void;
	onError?: (error: Error) => void;
}

/**
 * 統合バッチ処理フック
 *
 * @param options - オプション
 * @returns バッチ処理のmutationオブジェクト
 */
export function useUnifiedBatchProcessing(
	options?: UseUnifiedBatchProcessingOptions,
) {
	return useMutation({
		mutationFn: async (
			batchInput: UnifiedBatchInput,
		): Promise<UnifiedBatchResult> => {
			// Base64エンコードが必要な場合は変換
			const processedInput = await processBatchInput(batchInput);

			const response = await fetch("/api/batch/unified", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(processedInput),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to process unified batch");
			}

			return response.json();
		},
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}

/**
 * バッチ入力のBlobをBase64に変換
 */
async function processBatchInput(
	input: UnifiedBatchInput,
): Promise<UnifiedBatchInput> {
	if (input.type === "audio-batch") {
		// 音声ファイルのBlobをBase64に変換
		const audioFilesWithBase64 = await Promise.all(
			input.audioFiles.map(async (audio) => {
				const base64 = await blobToBase64(audio.audioBlob);
				return {
					...audio,
					audioBlob: base64,
				};
			}),
		);
		return {
			...input,
			audioFiles: audioFilesWithBase64,
		};
	}

	if (input.type === "multi-file") {
		// マルチファイルのBlobをBase64に変換
		const filesWithBase64 = await Promise.all(
			input.files.map(async (file) => {
				const base64 = await blobToBase64(file.fileBlob);
				return {
					...file,
					fileBlob: base64,
				};
			}),
		);
		return {
			...input,
			files: filesWithBase64,
		};
	}

	// image-batchの場合はそのまま返す（imageUrlは既に文字列）
	return input;
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
