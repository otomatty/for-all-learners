import { type NextRequest, NextResponse } from "next/server";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { createClient } from "@/lib/supabase/server";
import {
	executeWithQuotaCheck,
	getGeminiQuotaManager,
} from "@/lib/utils/geminiQuotaManager";
import logger from "@/lib/logger";

/**
 * POST /api/batch/audio/transcribe - Batch audio transcription processing
 *
 * Request body:
 * {
 *   audioFiles: Array<{
 *     audioId: string,
 *     audioName: string,
 *     audioBlob: string (base64),
 *     metadata?: {
 *       duration?: number,
 *       language?: string,
 *       priority?: number
 *     }
 *   }>
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   transcriptions: Array<{
 *     audioId: string,
 *     audioName: string,
 *     success: boolean,
 *     transcript?: string,
 *     error?: string,
 *     processingTimeMs?: number
 *   }>,
 *   totalCards: number,
 *   totalProcessingTimeMs: number,
 *   apiRequestsUsed: number
 * }
 *
 * Related Documentation:
 * - Original Server Action: app/_actions/audioBatchProcessing.ts
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
		const { audioFiles } = body;

		// 3. Input validation
		if (!audioFiles || !Array.isArray(audioFiles)) {
			return NextResponse.json(
				{ error: "Bad request", message: "audioFiles配列が必要です" },
				{ status: 400 },
			);
		}

		if (audioFiles.length === 0) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "少なくとも1つの音声ファイルが必要です",
				},
				{ status: 400 },
			);
		}

		if (audioFiles.length > 30) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "一度に処理できる音声ファイルは最大30個です",
				},
				{ status: 400 },
			);
		}

		// 4. Quota check
		const quotaManager = getGeminiQuotaManager();
		const estimatedRequests = Math.ceil(audioFiles.length / 3);
		const quotaCheck = quotaManager.checkQuota(estimatedRequests);

		if (!quotaCheck.canProceed) {
			return NextResponse.json(
				{
					error: "Too Many Requests",
					message: `音声バッチ処理が制限されました: ${quotaCheck.reason}`,
				},
				{ status: 429 },
			);
		}

		// 5. Upload audio files to Supabase Storage
		const uploadPromises = audioFiles.map(
			async (audio: {
				audioId: string;
				audioName: string;
				audioBlob: string;
			}) => {
				try {
					const timestamp = Date.now();
					const base64Data = audio.audioBlob.split(",")[1] || audio.audioBlob;
					const binaryString = Buffer.from(base64Data, "base64");
					const blob = new Blob([binaryString], {
						type: "audio/mp3",
					});

					const fileExtension = blob.type.includes("mp3") ? "mp3" : "wav";
					const filePath = `audio-batch/${user.id}/${timestamp}-${audio.audioId}.${fileExtension}`;

					const { error: uploadError } = await supabase.storage
						.from("audio-files")
						.upload(filePath, blob, {
							metadata: {
								userId: user.id,
								audioId: audio.audioId,
								audioName: audio.audioName,
								contentType: blob.type,
							},
						});

					if (uploadError) {
						return null;
					}

					// Create signed URL (30 minutes)
					const { data: signedData, error: signedError } =
						await supabase.storage
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
			},
		);

		const uploadResults = await Promise.all(uploadPromises);
		const validUploads = uploadResults.filter(
			(result): result is NonNullable<typeof result> => result !== null,
		);

		if (validUploads.length === 0) {
			return NextResponse.json({
				success: false,
				message: "すべての音声ファイルのアップロードに失敗しました",
				transcriptions: audioFiles.map(
					(f: { audioId: string; audioName: string }) => ({
						audioId: f.audioId,
						audioName: f.audioName,
						success: false,
						error: "アップロード失敗",
					}),
				),
				totalCards: 0,
				totalProcessingTimeMs: Date.now() - startTime,
				apiRequestsUsed: 0,
			});
		}

		// 6. Batch transcription processing (3 files at a time)
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

				// Wait between batches
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

		// 7. Cleanup uploaded files
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

		return NextResponse.json({
			success: successfulTranscriptions.length > 0,
			message: `音声バッチ処理完了: ${successfulTranscriptions.length}/${audioFiles.length}ファイル成功`,
			transcriptions: transcriptionResults,
			totalCards: 0, // Card generation is separate
			totalProcessingTimeMs: Date.now() - startTime,
			apiRequestsUsed,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				message:
					error instanceof Error
						? error.message
						: "音声バッチ処理中にエラーが発生しました",
				totalProcessingTimeMs: Date.now() - startTime,
			},
			{ status: 500 },
		);
	}
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

		// Upload each audio file to Gemini Files API
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

		// Batch transcription prompt
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

		// Create file URIs array
		const fileUris = validUploads.map((upload) => ({
			uri: upload.uri,
			mimeType: upload.mimeType,
		}));

		// Gemini API call
		const jsonString = await client.generateWithFiles?.(systemPrompt, fileUris);

		if (!jsonString) {
			throw new Error("Batch transcription failed: no response from LLM");
		}

		// Extract JSON
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

		// Map results
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
