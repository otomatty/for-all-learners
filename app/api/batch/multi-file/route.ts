/**
 * POST /api/batch/multi-file - Multi-file batch processing
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   ├─ hooks/batch/useMultiFileBatch.ts
 *
 * Dependencies (External files that this route uses):
 *   ├─ @/lib/supabase/server (createClient)
 *   ├─ @/lib/utils/blobUtils (base64ToBlob, getMimeTypeForFileType)
 *   ├─ @/lib/llm/factory (createClientWithUserKey)
 *   └─ @/lib/logger (logger)
 *
 * Related Documentation:
 *   ├─ Hook: hooks/batch/useMultiFileBatch.ts
 *   ├─ Tests: app/api/batch/multi-file/__tests__/route.test.ts
 *   ├─ Original Server Action: app/_actions/multiFileBatchProcessing.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClientWithUserKey } from "@/lib/llm/factory";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { base64ToBlob, getMimeTypeForFileType } from "@/lib/utils/blobUtils";

// Type definitions
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

/**
 * POST /api/batch/multi-file - Multi-file batch processing
 *
 * Request body (FormData or JSON):
 * - If FormData: files[] with metadata
 * - If JSON:
 *   {
 *     files: Array<{
 *       fileId: string,
 *       fileName: string,
 *       fileType: "pdf" | "image" | "audio",
 *       fileBlob: string (base64),
 *       metadata?: { isQuestion?: boolean, isAnswer?: boolean, priority?: number }
 *     }>
 *   }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   processedFiles: Array<{
 *     fileId: string,
 *     fileName: string,
 *     success: boolean,
 *     cards?: EnhancedPdfCard[],
 *     extractedText?: Array<{ pageNumber: number, text: string }>,
 *     error?: string,
 *     processingTimeMs?: number
 *   }>,
 *   totalCards: number,
 *   totalProcessingTimeMs: number,
 *   apiRequestsUsed: number
 * }
 *
 * Related Documentation:
 * - Original Server Action: app/_actions/multiFileBatchProcessing.ts
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
		const contentType = request.headers.get("content-type") || "";

		let files: MultiFileInput[] = [];

		if (contentType.includes("multipart/form-data")) {
			// FormData handling
			const formData = await request.formData();
			const fileEntries = Array.from(formData.entries()).filter(([key]) =>
				key.startsWith("file"),
			);

			if (fileEntries.length === 0) {
				return NextResponse.json(
					{
						error: "Bad request",
						message: "少なくとも1つのファイルが必要です",
					},
					{ status: 400 },
				);
			}

			files = await Promise.all(
				fileEntries.map(async ([key, value], index) => {
					if (value instanceof File) {
						const fileId =
							formData.get(`${key}_id`)?.toString() || `file-${index}`;
						const fileName = value.name;
						const fileType = formData.get(`${key}_type`)?.toString() as
							| "pdf"
							| "image"
							| "audio";
						const metadataStr = formData.get(`${key}_metadata`)?.toString();

						let metadata:
							| {
									isQuestion?: boolean;
									isAnswer?: boolean;
									priority?: number;
							  }
							| undefined;

						if (metadataStr) {
							try {
								metadata = JSON.parse(metadataStr);
							} catch {
								// Invalid JSON, ignore
							}
						}

						return {
							fileId,
							fileName,
							fileType: fileType || "pdf",
							fileBlob: new Blob([value], { type: value.type }),
							metadata,
						};
					}

					throw new Error(`Invalid file entry: ${key}`);
				}),
			);
		} else {
			// JSON handling
			const body = await request.json();
			const { files: filesData } = body;

			if (!filesData || !Array.isArray(filesData)) {
				return NextResponse.json(
					{
						error: "Bad request",
						message: "files配列が必要です",
					},
					{ status: 400 },
				);
			}

			if (filesData.length === 0) {
				return NextResponse.json(
					{
						error: "Bad request",
						message: "少なくとも1つのファイルが必要です",
					},
					{ status: 400 },
				);
			}

			// Validate file structure before conversion
			for (const file of filesData) {
				if (
					!file ||
					typeof file !== "object" ||
					!file.fileId ||
					!file.fileName ||
					!file.fileType ||
					!["pdf", "image", "audio"].includes(file.fileType) ||
					!file.fileBlob ||
					typeof file.fileBlob !== "string"
				) {
					return NextResponse.json(
						{
							error: "Bad request",
							message: "無効なファイルデータ形式です",
						},
						{ status: 400 },
					);
				}
			}

			if (filesData.length > 50) {
				return NextResponse.json(
					{
						error: "Bad request",
						message: "一度に処理できるファイルは最大50個です",
					},
					{ status: 400 },
				);
			}

			// Convert base64 strings to Blobs
			files = filesData.map(
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
		}

		// 3. Common validation (applies to both FormData and JSON paths)
		if (files.length === 0) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "少なくとも1つのファイルが必要です",
				},
				{ status: 400 },
			);
		}

		if (files.length > 50) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "一度に処理できるファイルは最大50個です",
				},
				{ status: 400 },
			);
		}

		// Validate file structure (only for FormData path - JSON path already validated)
		if (contentType.includes("multipart/form-data")) {
			for (const file of files) {
				if (
					!file.fileId ||
					!file.fileName ||
					!["pdf", "image", "audio"].includes(file.fileType) ||
					!(file.fileBlob instanceof Blob)
				) {
					return NextResponse.json(
						{
							error: "Bad request",
							message: "無効なファイルデータ形式です",
						},
						{ status: 400 },
					);
				}
			}
		}

		// 4. Process multi-file batch
		const result = await processMultiFilesBatch(user.id, files);

		return NextResponse.json({
			success: result.success,
			message: result.message,
			processedFiles: result.processedFiles,
			totalCards: result.totalCards,
			totalProcessingTimeMs: result.totalProcessingTimeMs,
			apiRequestsUsed: result.apiRequestsUsed,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				message:
					error instanceof Error
						? error.message
						: "複数ファイルバッチ処理中にエラーが発生しました",
				totalProcessingTimeMs: Date.now() - startTime,
			},
			{ status: 500 },
		);
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
					error: "PDF processing not implemented in multi-file route",
					processingTimeMs: Date.now() - fileStartTime,
				});
			} else if (file.fileType === "image") {
				// Image OCR processing
				const supabase = await createClient();
				const timestamp = Date.now();
				const fileExtension =
					file.fileBlob.type.includes("webp") ||
					file.fileBlob.type.includes("png")
						? "webp"
						: "png";
				const filePath = `ocr-images/${userId}/${timestamp}-${file.fileId}.${fileExtension}`;

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

				const ocrResult = await transcribeImage(signedData.signedUrl);

				if (ocrResult.success && ocrResult.text) {
					processedFiles.push({
						fileId: file.fileId,
						fileName: file.fileName,
						success: true,
						extractedText: [{ pageNumber: 1, text: ocrResult.text }],
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
				const supabase = await createClient();
				const timestamp = Date.now();
				const fileExtension = file.fileBlob.type.includes("mp3")
					? "mp3"
					: "wav";
				const filePath = `audio-files/${userId}/${timestamp}-${file.fileId}.${fileExtension}`;

				const { error: uploadError } = await supabase.storage
					.from("audio-files")
					.upload(filePath, file.fileBlob, {
						metadata: {
							userId,
							audioId: file.fileId,
							audioName: file.fileName,
							contentType: file.fileBlob.type,
						},
					});

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
					.from("audio-files")
					.createSignedUrl(filePath, 60 * 30);

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

				const transcriptResult = await transcribeAudio(signedData.signedUrl);

				if (transcriptResult.success && transcriptResult.transcript) {
					processedFiles.push({
						fileId: file.fileId,
						fileName: file.fileName,
						success: true,
						processingTimeMs: Date.now() - fileStartTime,
					});
					apiRequestsUsed++;
				} else {
					processedFiles.push({
						fileId: file.fileId,
						fileName: file.fileName,
						success: false,
						error: transcriptResult.error || "音声文字起こしに失敗",
						processingTimeMs: Date.now() - fileStartTime,
					});
				}

				// Cleanup uploaded file
				try {
					await supabase.storage.from("audio-files").remove([filePath]);
				} catch (error) {
					logger.error(
						{ error, filePath },
						`Failed to cleanup uploaded file: ${filePath}`,
					);
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
 * Transcribe single image for OCR
 */
async function transcribeImage(
	imageUrl: string,
): Promise<{ success: boolean; text?: string; error?: string }> {
	try {
		const client = await createClientWithUserKey({ provider: "google" });

		if (!client.uploadFile || !client.generateWithFiles) {
			return {
				success: false,
				error: "ファイルアップロードがサポートされていません",
			};
		}

		const res = await fetch(imageUrl);
		if (!res.ok) {
			return {
				success: false,
				error: `画像取得失敗: ${res.status}`,
			};
		}

		const arrayBuffer = await res.arrayBuffer();
		const blob = new Blob([arrayBuffer], {
			type: res.headers.get("content-type") ?? "image/png",
		});

		const uploadResult = await client.uploadFile?.(blob, {
			mimeType: blob.type,
		});

		if (!uploadResult) {
			return {
				success: false,
				error: "ファイルアップロードに失敗しました",
			};
		}

		const systemPrompt = "以下の画像からテキストを抽出してください。";

		const result = await client.generateWithFiles?.(systemPrompt, [
			{ uri: uploadResult.uri, mimeType: uploadResult.mimeType },
		]);

		if (!result) {
			return {
				success: false,
				error: "OCR処理に失敗しました",
			};
		}

		return {
			success: true,
			text: result.trim(),
		};
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "OCR処理中にエラーが発生しました",
		};
	}
}

/**
 * Transcribe single audio file
 */
async function transcribeAudio(
	audioUrl: string,
): Promise<{ success: boolean; transcript?: string; error?: string }> {
	try {
		const client = await createClientWithUserKey({ provider: "google" });

		if (!client.uploadFile || !client.generateWithFiles) {
			return {
				success: false,
				error: "ファイルアップロードがサポートされていません",
			};
		}

		const response = await fetch(audioUrl);
		if (!response.ok) {
			return {
				success: false,
				error: `音声取得失敗: ${response.status}`,
			};
		}

		const audioBlob = await response.blob();
		const uploadResult = await client.uploadFile?.(audioBlob, {
			mimeType: audioBlob.type,
		});

		if (!uploadResult) {
			return {
				success: false,
				error: "ファイルアップロードに失敗しました",
			};
		}

		const systemPrompt = "以下の音声ファイルを文字起こししてください。";

		const result = await client.generateWithFiles?.(systemPrompt, [
			{ uri: uploadResult.uri, mimeType: uploadResult.mimeType },
		]);

		if (!result) {
			return {
				success: false,
				error: "文字起こしに失敗しました",
			};
		}

		return {
			success: true,
			transcript: result.trim(),
		};
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "文字起こし中にエラーが発生しました",
		};
	}
}
