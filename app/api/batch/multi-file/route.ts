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
 *   └─ @/app/_actions/multiFileBatchProcessing (processMultiFilesBatch)
 *
 * Related Documentation:
 *   ├─ Hook: hooks/batch/useMultiFileBatch.ts
 *   ├─ Tests: app/api/batch/multi-file/__tests__/route.test.ts
 *   ├─ Original Server Action: app/_actions/multiFileBatchProcessing.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
	base64ToBlob,
	getMimeTypeForFileType,
} from "@/lib/utils/blobUtils";
import {
	type MultiFileInput,
	processMultiFilesBatch,
} from "@/app/_actions/multiFileBatchProcessing";

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
			const fileEntries = Array.from(formData.entries()).filter(
				([key]) => key.startsWith("file"),
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
						const fileId = formData.get(`${key}_id`)?.toString() || `file-${index}`;
						const fileName = value.name;
						const fileType = formData
							.get(`${key}_type`)
							?.toString() as "pdf" | "image" | "audio";
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

