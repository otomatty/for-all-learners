import { type NextRequest, NextResponse } from "next/server";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/batch/pdf/ocr - Batch OCR processing for PDF images
 *
 * Request body:
 * {
 *   imagePages: Array<{ pageNumber: number; imageBlob: string (base64) }>
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   extractedText?: Array<{ pageNumber: number; text: string }>,
 *   processingTimeMs?: number
 * }
 *
 * Related Documentation:
 * - Original Server Action: app/_actions/pdfBatchOcr.ts
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
		const { imagePages } = body;

		// 3. Input validation
		if (!imagePages || !Array.isArray(imagePages)) {
			return NextResponse.json(
				{ error: "Bad request", message: "imagePages配列が必要です" },
				{ status: 400 },
			);
		}

		if (imagePages.length === 0) {
			return NextResponse.json(
				{ error: "Bad request", message: "少なくとも1つの画像が必要です" },
				{ status: 400 },
			);
		}

		if (imagePages.length > 100) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "一度に処理できる画像は最大100枚です",
				},
				{ status: 400 },
			);
		}

		// Validate image page structure
		for (const page of imagePages) {
			if (
				typeof page.pageNumber !== "number" ||
				typeof page.imageBlob !== "string"
			) {
				return NextResponse.json(
					{
						error: "Bad request",
						message: "無効な画像データ形式です",
					},
					{ status: 400 },
				);
			}
		}

		// 4. Process PDF batch OCR
		const client = await createClientWithUserKey({ provider: "google" });

		if (!client.uploadFile || !client.generateWithFiles) {
			return NextResponse.json(
				{
					error: "Service unavailable",
					message: "ファイルアップロードがサポートされていません",
				},
				{ status: 503 },
			);
		}

		// Upload all images to Gemini Files API
		const uploadPromises = imagePages.map(
			async ({
				pageNumber,
				imageBlob,
			}: {
				pageNumber: number;
				imageBlob: string;
			}) => {
				// Convert base64 to Blob
				const base64Data = imageBlob.split(",")[1] || imageBlob;
				const binaryString = Buffer.from(base64Data, "base64");
				const blob = new Blob([binaryString], { type: "image/png" });

				const uploadResult = await client.uploadFile?.(blob, {
					mimeType: blob.type || "image/png",
				});

				if (!uploadResult) {
					throw new Error(`File upload failed for page ${pageNumber}`);
				}

				return {
					pageNumber,
					uri: uploadResult.uri,
					mimeType: uploadResult.mimeType,
				};
			},
		);

		const uploadedFiles = await Promise.all(uploadPromises);

		// Create file URIs array
		const fileUris = uploadedFiles.map(({ uri, mimeType }) => ({
			uri,
			mimeType,
		}));

		// Batch OCR prompt
		const systemPrompt = `以下の複数のPDF画像から、ページごとにテキストを抽出してください。

出力形式（JSON）:
[
  {
    "pageNumber": 1,
    "extractedText": "ページ1の抽出テキスト"
  },
  {
    "pageNumber": 2,
    "extractedText": "ページ2の抽出テキスト"
  }
]

注意事項:
- 画像の順序通りにページ番号を付けてください（1から開始）
- テキストが存在しないページの場合は、extractedTextを空文字列にしてください
- 可能な限り正確にテキストを抽出してください
- 数式や特殊記号も含めて抽出してください`;

		// Execute Gemini batch OCR
		let jsonString = await client.generateWithFiles?.(systemPrompt, fileUris);

		if (!jsonString) {
			return NextResponse.json(
				{
					error: "Processing failed",
					message: "バッチOCR処理に失敗しました",
				},
				{ status: 500 },
			);
		}

		// Extract JSON
		const fencePattern = /```(?:json)?\s*?\n([\s\S]*?)```/;
		const fenceMatch = jsonString.match(fencePattern);
		if (fenceMatch) {
			jsonString = fenceMatch[1].trim();
		} else {
			const start = jsonString.indexOf("[");
			const end = jsonString.lastIndexOf("]");
			if (start !== -1 && end !== -1 && end > start) {
				jsonString = jsonString.slice(start, end + 1);
			}
		}

		const parsed = JSON.parse(jsonString) as Array<{
			pageNumber: number;
			extractedText: string;
		}>;

		// Convert result
		const extractedText = parsed
			.filter(
				(item) => item.extractedText && item.extractedText.trim().length > 0,
			)
			.map((item) => ({
				pageNumber: item.pageNumber,
				text: item.extractedText.trim(),
			}));

		const processingTimeMs = Date.now() - startTime;

		return NextResponse.json({
			success: true,
			message: `バッチOCRで${extractedText.length}/${imagePages.length}ページからテキストを抽出しました`,
			extractedText,
			processingTimeMs,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				message:
					error instanceof Error
						? error.message
						: "バッチOCR処理中にエラーが発生しました",
				processingTimeMs: Date.now() - startTime,
			},
			{ status: 500 },
		);
	}
}
