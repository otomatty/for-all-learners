/**
 * Transcribe Image Batch Server Action (Placeholder for Tauri Migration)
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

export interface BatchOcrPage {
	pageNumber: number;
	imageUrl: string;
}

export interface BatchOcrResult {
	success: boolean;
	message: string;
	processedPages: Array<{
		pageNumber: number;
		success: boolean;
		extractedText?: string;
		error?: string;
		processingTimeMs?: number;
	}>;
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
}

/**
 * Transcribe images in batch
 * @deprecated Use API Routes or Tauri Commands instead
 */
export async function transcribeImagesBatch(
	userId: string,
	pages: BatchOcrPage[],
): Promise<BatchOcrResult> {
	logger.warn(
		{ userId, pageCount: pages.length },
		"transcribeImagesBatch called - should use API Routes or Tauri Commands",
	);

	throw new Error(
		"Image batch transcription not implemented - use API Routes or Tauri Commands",
	);
}
