/**
 * Multi-File Batch Processing Server Action (Placeholder for Tauri Migration)
 *
 * This file is a placeholder to allow imports in API Routes and tests.
 * The actual implementation should be migrated to API Routes or Tauri Commands.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ app/api/batch/multi-file/route.ts
 *   └─ app/api/batch/unified/route.ts
 *
 * Dependencies (External files that this file imports):
 *   └─ None (placeholder)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4)
 */

import logger from "@/lib/logger";

export interface MultiFileInput {
	fileId: string;
	fileName: string;
	fileType: "pdf" | "image" | "audio";
	fileBlob: Blob;
	metadata?: {
		isQuestion?: boolean;
		isAnswer?: boolean;
		priority?: number;
	};
}

export interface EnhancedPdfCard {
	front_content: unknown;
	back_content: unknown;
	source_audio_url?: string;
}

export interface MultiFileProcessingResult {
	success: boolean;
	message: string;
	processedFiles: Array<{
		fileId: string;
		fileName: string;
		success: boolean;
		cards?: EnhancedPdfCard[];
		extractedText?: Array<{ pageNumber: number; text: string }>;
		error?: string;
		processingTimeMs?: number;
	}>;
	totalCards: number;
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
}

/**
 * Process multiple files in batch
 * @deprecated Use API Routes or Tauri Commands instead
 */
export async function processMultiFilesBatch(
	userId: string,
	files: MultiFileInput[],
): Promise<MultiFileProcessingResult> {
	logger.warn(
		{ userId, fileCount: files.length },
		"processMultiFilesBatch called - should use API Routes or Tauri Commands",
	);

	throw new Error(
		"Multi-file batch processing not implemented - use API Routes or Tauri Commands",
	);
}
