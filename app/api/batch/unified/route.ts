/**
 * POST /api/batch/unified - Unified batch processing for multiple file types
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   ├─ hooks/batch/useUnifiedBatch.ts
 *
 * Dependencies (External files that this route uses):
 *   ├─ @/lib/supabase/server (createClient)
 *   ├─ @/lib/utils/geminiQuotaManager (getGeminiQuotaManager)
 *   ├─ @/lib/utils/blobUtils (base64ToBlob, getMimeTypeForFileType)
 *   ├─ @/app/_actions/audioBatchProcessing (processAudioFilesBatch)
 *   ├─ @/app/_actions/multiFileBatchProcessing (processMultiFilesBatch)
 *   └─ @/app/_actions/transcribeImageBatch (transcribeImagesBatch)
 *
 * Related Documentation:
 *   ├─ Hook: hooks/batch/useUnifiedBatch.ts
 *   ├─ Tests: app/api/batch/unified/__tests__/route.test.ts
 *   ├─ Original Server Action: app/_actions/unifiedBatchProcessor.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiQuotaManager } from "@/lib/utils/geminiQuotaManager";
import {
	base64ToBlob,
	getMimeTypeForFileType,
} from "@/lib/utils/blobUtils";
import {
	type AudioBatchInput,
	processAudioFilesBatch,
} from "@/app/_actions/audioBatchProcessing";
import {
	type MultiFileInput,
	processMultiFilesBatch,
} from "@/app/_actions/multiFileBatchProcessing";
import {
	type BatchOcrPage,
	transcribeImagesBatch,
} from "@/app/_actions/transcribeImageBatch";

/**
 * POST /api/batch/unified - Unified batch processing for multiple file types
 *
 * Request body:
 * {
 *   batchType: "multi-file" | "audio-batch" | "image-batch",
 *   // For multi-file:
 *   files?: Array<{
 *     fileId: string,
 *     fileName: string,
 *     fileType: "pdf" | "image" | "audio",
 *     fileBlob: string (base64),
 *     metadata?: { isQuestion?: boolean, isAnswer?: boolean, priority?: number }
 *   }>,
 *   // For audio-batch:
 *   audioFiles?: Array<{
 *     audioId: string,
 *     audioName: string,
 *     audioBlob: string (base64),
 *     metadata?: { duration?: number, language?: string, priority?: number }
 *   }>,
 *   // For image-batch:
 *   pages?: Array<{ pageNumber: number, imageUrl: string }>
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   batchType: "multi-file" | "audio-batch" | "image-batch",
 *   totalProcessingTimeMs: number,
 *   apiRequestsUsed: number,
 *   quotaStatus: { remaining: number, used: number, limit: number },
 *   multiFileResult?: MultiFileProcessingResult,
 *   audioBatchResult?: AudioBatchResult,
 *   imageBatchResult?: BatchOcrResult
 * }
 *
 * Related Documentation:
 * - Original Server Action: app/_actions/unifiedBatchProcessor.ts
 * - Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export async function POST(request: NextRequest) {
	const startTime = Date.now();

	try {
		// 1. Authentication check
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "ログインが必要です" },
				{ status: 401 },
			);
		}

		// 2. Parse request body
		const body = await request.json();
		const { batchType, files, audioFiles, pages } = body;

		// 3. Input validation
		if (!batchType || !["multi-file", "audio-batch", "image-batch"].includes(batchType)) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "batchTypeは 'multi-file', 'audio-batch', 'image-batch' のいずれかである必要があります",
				},
				{ status: 400 },
			);
		}

		// 4. Estimate API requests and check quota
		const quotaManager = getGeminiQuotaManager();
		const estimatedRequests =
			batchType === "audio-batch"
				? Math.ceil((audioFiles?.length || 0) / 3)
				: batchType === "image-batch"
					? Math.ceil((pages?.length || 0) / 4)
					: files?.length || 0;

		const quotaCheck = quotaManager.checkQuota(estimatedRequests);
		if (!quotaCheck.canProceed) {
			return NextResponse.json(
				{
					error: "Too Many Requests",
					message: `統合バッチ処理が制限されました: ${quotaCheck.reason}`,
				},
				{ status: 429 },
			);
		}

		// 5. Process based on batch type
		try {
			switch (batchType) {
				case "multi-file": {
					if (!files || !Array.isArray(files) || files.length === 0) {
						return NextResponse.json(
							{
								error: "Bad request",
								message: "multi-fileタイプにはfiles配列が必要です",
							},
							{ status: 400 },
						);
					}

					// Convert base64 strings to Blobs
					const multiFileInputs: MultiFileInput[] = files.map(
						(file: {
							fileId: string;
							fileName: string;
							fileType: "pdf" | "image" | "audio";
							fileBlob: string;
							metadata?: {
								isQuestion?: boolean;
								isAnswer?: boolean;
								priority?: number;
							};
						}) => {
							const blob = base64ToBlob(
								file.fileBlob,
								getMimeTypeForFileType(file.fileType),
							);

							return {
								fileId: file.fileId,
								fileName: file.fileName,
								fileType: file.fileType,
								fileBlob: blob,
								metadata: file.metadata,
							};
						},
					);

					const result = await processMultiFilesBatch(user.id, multiFileInputs);

					return NextResponse.json({
						success: result.success,
						message: result.message,
						batchType: "multi-file",
						totalProcessingTimeMs: Date.now() - startTime,
						apiRequestsUsed: result.apiRequestsUsed,
						quotaStatus: quotaManager.getQuotaStatus(),
						multiFileResult: result,
					});
				}

				case "audio-batch": {
					if (!audioFiles || !Array.isArray(audioFiles) || audioFiles.length === 0) {
						return NextResponse.json(
							{
								error: "Bad request",
								message: "audio-batchタイプにはaudioFiles配列が必要です",
							},
							{ status: 400 },
						);
					}

					// Convert base64 strings to Blobs
					const audioBatchInputs: AudioBatchInput[] = audioFiles.map(
						(audio: {
							audioId: string;
							audioName: string;
							audioBlob: string;
							metadata?: {
								duration?: number;
								language?: string;
								priority?: number;
							};
						}) => {
							const blob = base64ToBlob(audio.audioBlob, "audio/mp3");

							return {
								audioId: audio.audioId,
								audioName: audio.audioName,
								audioBlob: blob,
								metadata: audio.metadata,
							};
						},
					);

					const result = await processAudioFilesBatch(user.id, audioBatchInputs);

					return NextResponse.json({
						success: result.success,
						message: result.message,
						batchType: "audio-batch",
						totalProcessingTimeMs: Date.now() - startTime,
						apiRequestsUsed: result.apiRequestsUsed,
						quotaStatus: quotaManager.getQuotaStatus(),
						audioBatchResult: result,
					});
				}

				case "image-batch": {
					if (!pages || !Array.isArray(pages) || pages.length === 0) {
						return NextResponse.json(
							{
								error: "Bad request",
								message: "image-batchタイプにはpages配列が必要です",
							},
							{ status: 400 },
						);
					}

					// Validate page structure
					for (const page of pages) {
						if (
							typeof page.pageNumber !== "number" ||
							typeof page.imageUrl !== "string"
						) {
							return NextResponse.json(
								{
									error: "Bad request",
									message: "無効なページデータ形式です",
								},
								{ status: 400 },
							);
						}
					}

					const batchPages: BatchOcrPage[] = pages.map((page: BatchOcrPage) => ({
						pageNumber: page.pageNumber,
						imageUrl: page.imageUrl,
					}));

					const result = await transcribeImagesBatch(batchPages);
					const apiRequestsUsed = Math.ceil(batchPages.length / 4);

					return NextResponse.json({
						success: result.success,
						message: result.message,
						batchType: "image-batch",
						totalProcessingTimeMs: Date.now() - startTime,
						apiRequestsUsed,
						quotaStatus: quotaManager.getQuotaStatus(),
						imageBatchResult: result,
					});
				}
			}
		} catch (error) {
			return NextResponse.json(
				{
					success: false,
					message: `統合バッチ処理でエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
					batchType,
					totalProcessingTimeMs: Date.now() - startTime,
					apiRequestsUsed: 0,
					quotaStatus: quotaManager.getQuotaStatus(),
				},
				{ status: 500 },
			);
		}
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				message:
					error instanceof Error
						? error.message
						: "統合バッチ処理中にエラーが発生しました",
				totalProcessingTimeMs: Date.now() - startTime,
			},
			{ status: 500 },
		);
	}
}

