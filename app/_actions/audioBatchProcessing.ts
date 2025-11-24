/**
 * Audio Batch Processing Server Action (Placeholder for Tauri Migration)
 *
 * This file is a placeholder to allow imports in API Routes and tests.
 * The actual implementation should be migrated to API Routes or Tauri Commands.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/api/batch/unified/route.ts
 *
 * Dependencies (External files that this file imports):
 *   └─ None (placeholder)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4)
 */

import logger from "@/lib/logger";

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
	processedAudios: Array<{
		audioId: string;
		audioName: string;
		success: boolean;
		transcript?: string;
		error?: string;
		processingTimeMs?: number;
	}>;
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
}

/**
 * Process audio files in batch
 * @deprecated Use API Routes or Tauri Commands instead
 */
export async function processAudioFilesBatch(
	userId: string,
	audioFiles: AudioBatchInput[],
): Promise<AudioBatchResult> {
	logger.warn(
		{ userId, audioFileCount: audioFiles.length },
		"processAudioFilesBatch called - should use API Routes or Tauri Commands",
	);

	throw new Error(
		"Audio batch processing not implemented - use API Routes or Tauri Commands",
	);
}
