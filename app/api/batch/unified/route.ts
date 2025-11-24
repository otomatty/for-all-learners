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
 *   ├─ @/lib/utils/geminiQuotaManager (getGeminiQuotaManager, executeWithQuotaCheck)
 *   ├─ @/lib/utils/blobUtils (base64ToBlob, getMimeTypeForFileType)
 *   ├─ @/lib/llm/factory (createClientWithUserKey)
 *   └─ @/lib/logger (logger)
 *
 * Related Documentation:
 *   ├─ Hook: hooks/batch/useUnifiedBatch.ts
 *   ├─ Tests: app/api/batch/unified/__tests__/route.test.ts
 *   ├─ Original Server Action: app/_actions/unifiedBatchProcessor.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClientWithUserKey } from "@/lib/llm/factory";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { base64ToBlob, getMimeTypeForFileType } from "@/lib/utils/blobUtils";
import {
	executeWithQuotaCheck,
	getGeminiQuotaManager,
} from "@/lib/utils/geminiQuotaManager";

// Type definitions
interface AudioBatchInput {
	audioId: string;
	audioName: string;
	audioBlob: Blob;
	metadata?: {
		duration?: number;
		language?: string;
		priority?: number;
	};
}

interface MultiFileInput {
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

interface BatchOcrPage {
	pageNumber: number;
	imageUrl: string;
}

interface AudioBatchResult {
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

interface MultiFileProcessingResult {
	success: boolean;
	message: string;
	processedFiles: Array<{
		fileId: string;
		fileName: string;
		success: boolean;
		cards?: unknown[];
		extractedText?: Array<{ pageNumber: number; text: string }>;
		error?: string;
		processingTimeMs?: number;
	}>;
	totalCards: number;
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
}

interface BatchOcrResult {
	success: boolean;
	message: string;
	extractedPages?: Array<{ pageNumber: number; text: string }>;
	processedCount?: number;
	skippedCount?: number;
}

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
		if (
			!batchType ||
			!["multi-file", "audio-batch", "image-batch"].includes(batchType)
		) {
			return NextResponse.json(
				{
					error: "Bad request",
					message:
						"batchTypeは 'multi-file', 'audio-batch', 'image-batch' のいずれかである必要があります",
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
					if (
						!audioFiles ||
						!Array.isArray(audioFiles) ||
						audioFiles.length === 0
					) {
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

					const result = await processAudioFilesBatch(
						user.id,
						audioBatchInputs,
					);

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

					const batchPages: BatchOcrPage[] = pages.map(
						(page: BatchOcrPage) => ({
							pageNumber: page.pageNumber,
							imageUrl: page.imageUrl,
						}),
					);

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

/**
 * Process audio files batch for transcription
 */
async function processAudioFilesBatch(
	userId: string,
	audioFiles: AudioBatchInput[],
): Promise<AudioBatchResult> {
	const startTime = Date.now();
	const supabase = await createClient();

	// Upload audio files to Supabase Storage
	const uploadPromises = audioFiles.map(async (audio) => {
		try {
			const timestamp = Date.now();
			const fileExtension = audio.audioBlob.type.includes("mp3")
				? "mp3"
				: "wav";
			const filePath = `audio-batch/${userId}/${timestamp}-${audio.audioId}.${fileExtension}`;

			const { error: uploadError } = await supabase.storage
				.from("audio-files")
				.upload(filePath, audio.audioBlob, {
					metadata: {
						userId,
						audioId: audio.audioId,
						audioName: audio.audioName,
						contentType: audio.audioBlob.type,
					},
				});

			if (uploadError) {
				return null;
			}

			const { data: signedData, error: signedError } = await supabase.storage
				.from("audio-files")
				.createSignedUrl(filePath, 60 * 30);

			if (signedError || !signedData.signedUrl) {
				return null;
			}

			return {
				audioId: audio.audioId,
				audioName: audio.audioName,
				audioUrl: signedData.signedUrl,
				filePath,
			};
		} catch (_error) {
			return null;
		}
	});

	const uploadResults = await Promise.all(uploadPromises);
	const validUploads = uploadResults.filter(
		(result): result is NonNullable<typeof result> => result !== null,
	);

	if (validUploads.length === 0) {
		return {
			success: false,
			message: "すべての音声ファイルのアップロードに失敗しました",
			transcriptions: audioFiles.map((f) => ({
				audioId: f.audioId,
				audioName: f.audioName,
				success: false,
				error: "アップロード失敗",
			})),
			totalCards: 0,
			totalProcessingTimeMs: Date.now() - startTime,
			apiRequestsUsed: 0,
		};
	}

	// Batch transcription processing (3 files at a time)
	const transcriptionResults: Array<{
		audioId: string;
		audioName: string;
		success: boolean;
		transcript?: string;
		error?: string;
		processingTimeMs?: number;
	}> = [];

	const batchSize = 3;
	let apiRequestsUsed = 0;

	for (let i = 0; i < validUploads.length; i += batchSize) {
		const batch = validUploads.slice(i, i + batchSize);
		const batchNumber = Math.floor(i / batchSize) + 1;

		try {
			const batchResult = await executeWithQuotaCheck(
				() => processBatchAudioTranscription(batch),
				1,
				`音声バッチ${batchNumber}処理`,
			);

			transcriptionResults.push(...batchResult);
			apiRequestsUsed++;

			if (i + batchSize < validUploads.length) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		} catch (error) {
			const errorResults = batch.map((audio) => ({
				audioId: audio.audioId,
				audioName: audio.audioName,
				success: false,
				error: error instanceof Error ? error.message : "バッチ処理エラー",
				processingTimeMs: 0,
			}));
			transcriptionResults.push(...errorResults);
		}
	}

	// Cleanup uploaded files
	const cleanupPromises = validUploads.map(async (upload) => {
		try {
			await supabase.storage.from("audio-files").remove([upload.filePath]);
		} catch (error) {
			logger.error(
				{ error, filePath: upload.filePath },
				`Failed to cleanup uploaded file: ${upload.filePath}`,
			);
		}
	});
	try {
		await Promise.all(cleanupPromises);
	} catch (error) {
		logger.error({ error }, "Cleanup of uploaded files failed");
	}

	const successfulTranscriptions = transcriptionResults.filter(
		(result) => result.success,
	);

	return {
		success: successfulTranscriptions.length > 0,
		message: `音声バッチ処理完了: ${successfulTranscriptions.length}/${audioFiles.length}ファイル成功`,
		transcriptions: transcriptionResults,
		totalCards: 0,
		totalProcessingTimeMs: Date.now() - startTime,
		apiRequestsUsed,
	};
}

/**
 * Process 3 audio files simultaneously for transcription
 */
async function processBatchAudioTranscription(
	batch: Array<{
		audioId: string;
		audioName: string;
		audioUrl: string;
	}>,
): Promise<
	Array<{
		audioId: string;
		audioName: string;
		success: boolean;
		transcript?: string;
		error?: string;
		processingTimeMs?: number;
	}>
> {
	const startTime = Date.now();

	try {
		const client = await createClientWithUserKey({ provider: "google" });

		if (!client.uploadFile || !client.generateWithFiles) {
			throw new Error("File upload is not supported by this provider");
		}

		const uploadPromises = batch.map(async (audio) => {
			try {
				const response = await fetch(audio.audioUrl);
				if (!response.ok) {
					throw new Error(`音声取得失敗: ${response.status}`);
				}

				const audioBlob = await response.blob();
				const uploadResult = await client.uploadFile?.(audioBlob, {
					mimeType: audioBlob.type,
				});

				if (!uploadResult) {
					throw new Error(`File upload failed for audio: ${audio.audioName}`);
				}

				return {
					audioId: audio.audioId,
					audioName: audio.audioName,
					uri: uploadResult.uri,
					mimeType: uploadResult.mimeType,
				};
			} catch (_error) {
				return null;
			}
		});

		const uploadResults = await Promise.all(uploadPromises);
		const validUploads = uploadResults.filter(
			(result): result is NonNullable<typeof result> => result !== null,
		);

		if (validUploads.length === 0) {
			throw new Error("すべての音声ファイルのGeminiアップロードに失敗");
		}

		const systemPrompt = `以下の${validUploads.length}つの音声ファイルをそれぞれ文字起こししてください。
各音声に対して、以下のJSON配列形式で結果を返してください：

[
  {
    "audioIndex": 音声の番号（1から始まる）,
    "transcript": "文字起こし結果",
    "language": "検出された言語",
    "confidence": 0.0-1.0の信頼度
  }
]

重要な指示:
- 各音声ファイルの内容を正確に文字起こししてください
- 音声が不明瞭な場合は "transcript": "[不明瞭]" としてください
- 音声の順序は入力順と同じにしてください
- 話者の区別が可能な場合は適切に区分してください`;

		const fileUris = validUploads.map((upload) => ({
			uri: upload.uri,
			mimeType: upload.mimeType,
		}));

		const jsonString = await client.generateWithFiles?.(systemPrompt, fileUris);

		if (!jsonString) {
			throw new Error("Batch transcription failed: no response from LLM");
		}

		let extractedJson = jsonString;
		const fencePattern = /```(?:json)?\s*?\n([\s\S]*?)```/;
		const fenceMatch = extractedJson.match(fencePattern);
		if (fenceMatch) {
			extractedJson = fenceMatch[1].trim();
		} else {
			const start = extractedJson.indexOf("[");
			const end = extractedJson.lastIndexOf("]");
			if (start !== -1 && end !== -1 && end > start) {
				extractedJson = extractedJson.slice(start, end + 1);
			}
		}

		const parsed = JSON.parse(extractedJson);
		if (!Array.isArray(parsed)) {
			throw new Error("文字起こしレスポンスが配列ではありません");
		}

		const results = validUploads.map((upload, index) => {
			const transcriptData =
				parsed.find(
					(item: unknown) =>
						typeof item === "object" &&
						item !== null &&
						"audioIndex" in item &&
						(item as { audioIndex: number }).audioIndex === index + 1,
				) || parsed[index];

			if (
				transcriptData &&
				typeof transcriptData === "object" &&
				"transcript" in transcriptData &&
				(transcriptData as { transcript: string }).transcript !== "[不明瞭]"
			) {
				return {
					audioId: upload.audioId,
					audioName: upload.audioName,
					success: true,
					transcript: (
						transcriptData as { transcript: string }
					).transcript.trim(),
					processingTimeMs: Date.now() - startTime,
				};
			}

			return {
				audioId: upload.audioId,
				audioName: upload.audioName,
				success: false,
				error: "文字起こしに失敗または不明瞭な音声",
				processingTimeMs: Date.now() - startTime,
			};
		});

		return results;
	} catch (error) {
		return batch.map((audio) => ({
			audioId: audio.audioId,
			audioName: audio.audioName,
			success: false,
			error: error instanceof Error ? error.message : "バッチ処理エラー",
			processingTimeMs: Date.now() - startTime,
		}));
	}
}

/**
 * Process multi-file batch (PDF, image, audio)
 */
async function processMultiFilesBatch(
	userId: string,
	files: MultiFileInput[],
): Promise<MultiFileProcessingResult> {
	const startTime = Date.now();
	const processedFiles: MultiFileProcessingResult["processedFiles"] = [];
	const totalCards = 0;
	let apiRequestsUsed = 0;

	for (const file of files) {
		const fileStartTime = Date.now();
		try {
			if (file.fileType === "pdf") {
				// PDF processing would require PDF.js - simplified for now
				processedFiles.push({
					fileId: file.fileId,
					fileName: file.fileName,
					success: false,
					error: "PDF processing not implemented in unified route",
					processingTimeMs: Date.now() - fileStartTime,
				});
			} else if (file.fileType === "image") {
				// Image OCR processing
				const supabase = await createClient();
				const timestamp = Date.now();
				const filePath = `ocr-images/${userId}/${timestamp}-${file.fileId}.webp`;

				const { error: uploadError } = await supabase.storage
					.from("ocr-images")
					.upload(filePath, file.fileBlob, { metadata: { userId } });

				if (uploadError) {
					processedFiles.push({
						fileId: file.fileId,
						fileName: file.fileName,
						success: false,
						error: `アップロード失敗: ${uploadError.message}`,
						processingTimeMs: Date.now() - fileStartTime,
					});
					continue;
				}

				const { data: signedData, error: signedError } = await supabase.storage
					.from("ocr-images")
					.createSignedUrl(filePath, 60 * 5);

				if (signedError || !signedData.signedUrl) {
					processedFiles.push({
						fileId: file.fileId,
						fileName: file.fileName,
						success: false,
						error: "Signed URL取得失敗",
						processingTimeMs: Date.now() - fileStartTime,
					});
					continue;
				}

				const ocrResult = await transcribeImagesBatch([
					{ pageNumber: 1, imageUrl: signedData.signedUrl },
				]);

				if (ocrResult.success && ocrResult.extractedPages) {
					processedFiles.push({
						fileId: file.fileId,
						fileName: file.fileName,
						success: true,
						extractedText: ocrResult.extractedPages,
						processingTimeMs: Date.now() - fileStartTime,
					});
					apiRequestsUsed++;
				} else {
					processedFiles.push({
						fileId: file.fileId,
						fileName: file.fileName,
						success: false,
						error: "OCR処理に失敗",
						processingTimeMs: Date.now() - fileStartTime,
					});
				}
			} else if (file.fileType === "audio") {
				// Audio transcription
				const audioResult = await processAudioFilesBatch(userId, [
					{
						audioId: file.fileId,
						audioName: file.fileName,
						audioBlob: file.fileBlob,
						metadata: file.metadata,
					},
				]);

				if (audioResult.success && audioResult.transcriptions.length > 0) {
					const transcription = audioResult.transcriptions[0];
					processedFiles.push({
						fileId: file.fileId,
						fileName: file.fileName,
						success: transcription.success,
						error: transcription.error,
						processingTimeMs: transcription.processingTimeMs,
					});
					apiRequestsUsed += audioResult.apiRequestsUsed;
				} else {
					processedFiles.push({
						fileId: file.fileId,
						fileName: file.fileName,
						success: false,
						error: "音声文字起こしに失敗",
						processingTimeMs: Date.now() - fileStartTime,
					});
				}
			}
		} catch (error) {
			processedFiles.push({
				fileId: file.fileId,
				fileName: file.fileName,
				success: false,
				error: error instanceof Error ? error.message : "処理エラー",
				processingTimeMs: Date.now() - fileStartTime,
			});
		}
	}

	const successfulFiles = processedFiles.filter((f) => f.success);

	return {
		success: successfulFiles.length > 0,
		message: `マルチファイル処理完了: ${successfulFiles.length}/${files.length}ファイル成功`,
		processedFiles,
		totalCards,
		totalProcessingTimeMs: Date.now() - startTime,
		apiRequestsUsed,
	};
}

/**
 * Process images batch for OCR
 */
async function transcribeImagesBatch(
	pages: BatchOcrPage[],
): Promise<BatchOcrResult> {
	const client = await createClientWithUserKey({ provider: "google" });

	if (!client.uploadFile || !client.generateWithFiles) {
		return {
			success: false,
			message: "ファイルアップロードがサポートされていません",
			processedCount: 0,
			skippedCount: pages.length,
		};
	}

	const uploadPromises = pages.map(async (page) => {
		try {
			const res = await fetch(page.imageUrl);
			if (!res.ok) {
				throw new Error(`画像取得失敗: ${res.status}`);
			}

			const arrayBuffer = await res.arrayBuffer();
			const blob = new Blob([arrayBuffer], {
				type: res.headers.get("content-type") ?? "image/png",
			});

			const uploadResult = await client.uploadFile?.(blob, {
				mimeType: blob.type,
			});

			if (!uploadResult) {
				throw new Error(`File upload failed for page ${page.pageNumber}`);
			}

			return {
				pageNumber: page.pageNumber,
				uri: uploadResult.uri,
				mimeType: uploadResult.mimeType,
			};
		} catch (_error) {
			return null;
		}
	});

	const uploadResults = await Promise.all(uploadPromises);
	const validUploads = uploadResults.filter(
		(result): result is NonNullable<typeof result> => result !== null,
	);

	if (validUploads.length === 0) {
		return {
			success: false,
			message: "すべての画像アップロードに失敗しました",
			processedCount: 0,
			skippedCount: pages.length,
		};
	}

	const systemPrompt = `以下の${validUploads.length}枚の画像からテキストを抽出してください。
各画像に対して、以下のJSON配列形式で結果を返してください：

[
  {
    "pageNumber": 画像の番号,
    "extractedText": "抽出されたテキスト"
  }
]

重要な指示:
- 各画像から可能な限り正確にテキストを抽出してください
- テキストが見つからない場合は "extractedText": "" としてください
- 画像の順序は入力順と同じにしてください
- 数式や図表の内容も可能な限りテキスト化してください`;

	const fileUris = validUploads.map((upload) => ({
		uri: upload.uri,
		mimeType: upload.mimeType,
	}));

	try {
		const jsonString = await client.generateWithFiles?.(systemPrompt, fileUris);

		if (!jsonString) {
			return {
				success: false,
				message: "OCR処理に失敗しました",
				processedCount: 0,
				skippedCount: pages.length,
			};
		}

		let extractedJson = jsonString;
		const fencePattern = /```(?:json)?\s*?\n([\s\S]*?)```/;
		const fenceMatch = extractedJson.match(fencePattern);
		if (fenceMatch) {
			extractedJson = fenceMatch[1].trim();
		} else {
			const start = extractedJson.indexOf("[");
			const end = extractedJson.lastIndexOf("]");
			if (start !== -1 && end !== -1 && end > start) {
				extractedJson = extractedJson.slice(start, end + 1);
			}
		}

		const parsed = JSON.parse(extractedJson);
		if (!Array.isArray(parsed)) {
			return {
				success: false,
				message: "レスポンスが配列ではありません",
				processedCount: 0,
				skippedCount: pages.length,
			};
		}

		const extractedPages = parsed
			.filter(
				(
					item: unknown,
				): item is { pageNumber: number; extractedText: string } =>
					typeof item === "object" &&
					item !== null &&
					"pageNumber" in item &&
					"extractedText" in item &&
					typeof (item as { pageNumber: unknown }).pageNumber === "number" &&
					typeof (item as { extractedText: unknown }).extractedText ===
						"string",
			)
			.map((item) => ({
				pageNumber: item.pageNumber,
				text: item.extractedText.trim(),
			}))
			.filter((item) => item.text.length > 0);

		return {
			success: extractedPages.length > 0,
			message: `OCR処理完了: ${extractedPages.length}/${pages.length}ページ成功`,
			extractedPages,
			processedCount: extractedPages.length,
			skippedCount: pages.length - extractedPages.length,
		};
	} catch (error) {
		return {
			success: false,
			message:
				error instanceof Error
					? error.message
					: "OCR処理中にエラーが発生しました",
			processedCount: 0,
			skippedCount: pages.length,
		};
	}
}
