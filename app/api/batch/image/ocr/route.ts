import { type NextRequest, NextResponse } from "next/server";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { createClient } from "@/lib/supabase/server";
import {
	executeWithQuotaCheck,
	getGeminiQuotaManager,
} from "@/lib/utils/geminiQuotaManager";

/**
 * POST /api/batch/image/ocr - Batch OCR processing for multiple images
 *
 * Request body:
 * {
 *   pages: Array<{ pageNumber: number; imageUrl: string }>,
 *   batchSize?: number (default: 4, max: 10)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   extractedPages?: Array<{ pageNumber: number; text: string }>,
 *   processedCount?: number,
 *   skippedCount?: number
 * }
 *
 * Related Documentation:
 * - Tests: app/api/batch/image/ocr/__tests__/route.test.ts
 * - Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export async function POST(request: NextRequest) {
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
		const { pages, batchSize = 4 } = body;

		// 3. Input validation
		if (!pages || !Array.isArray(pages)) {
			return NextResponse.json(
				{ error: "Bad request", message: "pages配列が必要です" },
				{ status: 400 },
			);
		}

		if (pages.length === 0) {
			return NextResponse.json(
				{ error: "Bad request", message: "少なくとも1つの画像が必要です" },
				{ status: 400 },
			);
		}

		if (pages.length > 100) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "一度に処理できる画像は最大100枚です",
				},
				{ status: 400 },
			);
		}

		if (batchSize < 1 || batchSize > 10) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "batchSizeは1から10の範囲で指定してください",
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

		// 4. Quota check
		const quotaManager = getGeminiQuotaManager();
		const quotaCheck = quotaManager.validatePdfProcessing(pages.length);

		if (!quotaCheck.canProcess) {
			return NextResponse.json(
				{
					error: "Too Many Requests",
					message: quotaCheck.message,
					suggestion: quotaCheck.suggestion,
				},
				{ status: 429 },
			);
		}

		// 5. Batch OCR processing
		const extractedPages: Array<{ pageNumber: number; text: string }> = [];
		let processedCount = 0;
		let skippedCount = 0;

		// Process in batches
		for (let i = 0; i < pages.length; i += batchSize) {
			const batch = pages.slice(i, i + batchSize);
			const batchNumber = Math.floor(i / batchSize) + 1;

			try {
				const batchResult = await executeWithQuotaCheck(
					() => processBatchWithRetry(batch),
					1,
					`バッチ${batchNumber}OCR処理`,
				);

				extractedPages.push(...batchResult);
				processedCount += batchResult.length;

				// Rate limiting: wait between batches
				if (i + batchSize < pages.length) {
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			} catch (error: unknown) {
				skippedCount += batch.length;

				// Stop on quota errors
				if (error instanceof Error && error.message.includes("クォータ")) {
					break;
				}

				// Continue on other errors
			}
		}

		// 6. Response
		if (extractedPages.length === 0) {
			return NextResponse.json({
				success: false,
				message:
					"すべてのページでOCR処理に失敗しました。画像の品質やAPI制限を確認してください。",
				processedCount,
				skippedCount,
			});
		}

		return NextResponse.json({
			success: true,
			message: `バッチOCR処理完了: ${processedCount}/${pages.length}ページ処理成功`,
			extractedPages,
			processedCount,
			skippedCount,
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				message:
					error instanceof Error
						? error.message
						: "バッチOCR処理中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * Process one batch of images (up to batchSize pages) with retry logic
 */
async function processBatchWithRetry(
	batch: Array<{ pageNumber: number; imageUrl: string }>,
): Promise<Array<{ pageNumber: number; text: string }>> {
	// Create dynamic LLM client
	const client = await createClientWithUserKey({ provider: "google" });

	if (!client.uploadFile || !client.generateWithFiles) {
		throw new Error("File upload is not supported by this provider");
	}

	// Upload each image to Gemini Files API
	const uploadPromises = batch.map(async (page) => {
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
		throw new Error("すべての画像アップロードに失敗しました");
	}

	// Batch OCR prompt
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

	// Create file URIs array
	const fileUris = validUploads.map((upload) => ({
		uri: upload.uri,
		mimeType: upload.mimeType,
	}));

	// Execute OCR with retry
	const jsonString = await callGeminiWithRetry(async () => {
		const result = await client.generateWithFiles?.(systemPrompt, fileUris);
		if (!result) {
			throw new Error("Batch OCR failed: no response from LLM");
		}
		return result;
	});

	// Extract JSON from response
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

	if (!extractedJson) {
		throw new Error("Failed to extract JSON from OCR response");
	}

	try {
		const parsed = JSON.parse(extractedJson);
		if (!Array.isArray(parsed)) {
			throw new Error("レスポンスが配列ではありません");
		}

		return parsed
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
			.filter((item) => item.text.length > 0); // Filter out empty text
	} catch (_parseError) {
		// Fallback: process pages individually
		return await processPagesIndividually(validUploads);
	}
}

/**
 * Fallback: process pages individually if batch processing fails
 */
async function processPagesIndividually(
	uploads: Array<{ pageNumber: number; uri: string; mimeType: string }>,
): Promise<Array<{ pageNumber: number; text: string }>> {
	const client = await createClientWithUserKey({ provider: "google" });

	if (!client.generateWithFiles) {
		throw new Error("File generation is not supported by this provider");
	}

	const results: Array<{ pageNumber: number; text: string }> = [];

	for (const upload of uploads) {
		try {
			const text = await callGeminiWithRetry(async () => {
				const result = await client.generateWithFiles?.(
					"以下の画像からテキストを抽出してください。",
					[{ uri: upload.uri, mimeType: upload.mimeType }],
				);
				if (!result) {
					throw new Error("OCR failed: no response from LLM");
				}
				return result;
			});

			if (text?.trim()) {
				results.push({
					pageNumber: upload.pageNumber,
					text: text.trim(),
				});
			}

			// Wait between individual processing
			await new Promise((resolve) => setTimeout(resolve, 200));
		} catch (_error) {
			// Continue on error
		}
	}

	return results;
}

/**
 * Retry logic with exponential backoff for Gemini API calls
 */
async function callGeminiWithRetry<T>(
	apiCall: () => Promise<T>,
	maxRetries = 3,
	baseDelayMs = 1000,
): Promise<T> {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await apiCall();
		} catch (error: unknown) {
			// Quota error (429)
			if (
				error &&
				typeof error === "object" &&
				"status" in error &&
				error.status === 429
			) {
				const retryInfo = (
					error as { details?: { "@type"?: string; retryDelay?: string }[] }
				).details?.find((d) => d["@type"]?.includes("RetryInfo"));
				const retryDelayStr = retryInfo?.retryDelay;

				if (attempt < maxRetries && retryDelayStr) {
					const delayMs = parseRetryDelay(retryDelayStr);
					await new Promise((resolve) => setTimeout(resolve, delayMs));
					continue;
				}

				throw new Error(
					`Gemini APIクォータ制限に達しました。しばらく待ってから再試行してください。\n詳細: ${(error as unknown as Error).message}`,
				);
			}

			// Other errors: exponential backoff
			if (attempt < maxRetries) {
				const delayMs = baseDelayMs * 2 ** (attempt - 1);
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				continue;
			}

			throw error;
		}
	}

	throw new Error("予期しないエラー: リトライループを抜けました");
}

/**
 * Parse RetryDelay string to milliseconds
 */
function parseRetryDelay(retryDelayStr: string): number {
	// "12s" -> 12000ms, "1m" -> 60000ms, etc.
	const match = retryDelayStr.match(/^(\d+)([sm]?)$/);
	if (!match) return 5000; // Default 5 seconds

	const value = Number.parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case "m":
			return value * 60 * 1000;
		case "s":
		case "":
			return value * 1000;
		default:
			return 5000;
	}
}
