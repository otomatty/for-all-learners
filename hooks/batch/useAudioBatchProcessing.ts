/**
 * useAudioBatchProcessing Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this hook):
 *   └─ (作成予定: 音声バッチ処理を使用するコンポーネント)
 *
 * Dependencies (External files that this hook imports):
 *   ├─ @tanstack/react-query (useMutation)
 *   └─ app/api/batch/audio/route.ts (API Route)
 *
 * Related Documentation:
 *   ├─ Spec: ./useAudioBatchProcessing.spec.md (作成予定)
 *   ├─ Tests: ./__tests__/useAudioBatchProcessing.test.ts (作成予定)
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

"use client";

import { useMutation } from "@tanstack/react-query";

export interface AudioBatchInput {
	audioId: string;
	audioName: string;
	audioBlob: Blob;
	metadata?: {
		duration?: number;
		language?: string;
		priority?: number;
	};
}

export interface AudioBatchResult {
	success: boolean;
	message: string;
	transcriptions: Array<{
		audioId: string;
		audioName: string;
		success: boolean;
		transcript?: string;
		cards?: Array<{
			front_content: string;
			back_content: string;
			source_pdf_url: string;
		}>;
		error?: string;
		processingTimeMs?: number;
	}>;
	totalCards: number;
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
}

/**
 * BlobをBase64文字列に変換
 */
function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			if (typeof reader.result === "string") {
				// data:audio/mpeg;base64, のプレフィックスを除去
				const base64 = reader.result.split(",")[1];
				resolve(base64);
			} else {
				reject(new Error("Failed to convert blob to base64"));
			}
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

export function useAudioBatchProcessing() {
	return useMutation({
		mutationFn: async (
			audioFiles: AudioBatchInput[],
		): Promise<AudioBatchResult> => {
			// Convert Blobs to Base64 strings
			const audioFilesWithBase64 = await Promise.all(
				audioFiles.map(async (file) => ({
					audioId: file.audioId,
					audioName: file.audioName,
					audioBlob: await blobToBase64(file.audioBlob),
					metadata: file.metadata,
				})),
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
				throw new Error(error.error || "Audio batch processing failed");
			}

			return response.json();
		},
	});
}
