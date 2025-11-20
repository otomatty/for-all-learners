/**
 * Audio Batch Processing Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ components/batch/AudioBatchProcessor.tsx
 *   └─ app/(protected)/decks/[deckId]/audio/_components/AudioCardGenerator.tsx
 *
 * Dependencies (依存先):
 *   ├─ app/api/batch/audio/route.ts (API Route)
 *   └─ @tanstack/react-query (useMutation)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import type {
	AudioBatchInput,
	AudioBatchResult,
} from "@/app/_actions/audioBatchProcessing";

export interface UseAudioBatchProcessingOptions {
	onSuccess?: (result: AudioBatchResult) => void;
	onError?: (error: Error) => void;
}

/**
 * 音声ファイルのバッチ文字起こし処理フック
 *
 * @param options - オプション
 * @returns バッチ処理のmutationオブジェクト
 */
export function useAudioBatchProcessing(
	options?: UseAudioBatchProcessingOptions,
) {
	return useMutation({
		mutationFn: async (
			audioFiles: Array<{
				audioId: string;
				audioName: string;
				audioBlob: Blob;
				metadata?: {
					duration?: number;
					language?: string;
					priority?: number;
				};
			}>,
		): Promise<AudioBatchResult> => {
			// BlobをBase64に変換
			const audioFilesWithBase64 = await Promise.all(
				audioFiles.map(async (audio) => {
					const base64 = await blobToBase64(audio.audioBlob);
					return {
						audioId: audio.audioId,
						audioName: audio.audioName,
						audioBlob: base64,
						metadata: audio.metadata,
					};
				}),
			);

			const response = await fetch("/api/batch/audio", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					audioFiles: audioFilesWithBase64,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to process audio batch");
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
