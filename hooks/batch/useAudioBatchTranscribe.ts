/**
 * Custom Hook: useAudioBatchTranscribe
 * 
 * Audio batch transcription processing
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
 *   ├─ API Route: app/api/batch/audio/transcribe/route.ts
 *   ├─ Tests: hooks/batch/__tests__/useAudioBatchTranscribe.test.tsx
 *   ├─ Original Server Action: app/_actions/audioBatchProcessing.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

"use client";

import { useMutation } from "@tanstack/react-query";

export interface AudioBatchInput {
	audioId: string;
	audioName: string;
	audioBlob: string; // base64 encoded
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
		error?: string;
		processingTimeMs?: number;
	}>;
	totalCards: number;
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
}

export interface UseAudioBatchTranscribeOptions {
	onSuccess?: (result: AudioBatchResult) => void;
	onError?: (error: Error) => void;
}

/**
 * Hook for audio batch transcription
 * 
 * @param options - Configuration options
 * @returns Mutation hook for audio batch transcription
 * 
 * @example
 * ```tsx
 * const { mutate, isPending, data } = useAudioBatchTranscribe({
 *   onSuccess: (result) => {
 *     console.log(`Transcribed ${result.transcriptions.length} files`);
 *   },
 * });
 * 
 * // Process audio files
 * mutate({
 *   audioFiles: [
 *     {
 *       audioId: "audio-1",
 *       audioName: "lecture.mp3",
 *       audioBlob: "data:audio/mp3;base64,...",
 *     },
 *   ],
 * });
 * ```
 */
export function useAudioBatchTranscribe(
	options?: UseAudioBatchTranscribeOptions,
) {
	return useMutation({
		mutationFn: async (params: {
			audioFiles: AudioBatchInput[];
		}): Promise<AudioBatchResult> => {
			const response = await fetch("/api/batch/audio/transcribe", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					audioFiles: params.audioFiles,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || "Audio batch transcription failed",
				);
			}

			return await response.json();
		},
		onSuccess: options?.onSuccess,
		onError: options?.onError,
	});
}
