import { type NextRequest, NextResponse } from "next/server";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/batch/pdf/dual-ocr - Dual PDF batch OCR processing
 *
 * Process both question PDF and answer PDF simultaneously for high-quality card generation
 *
 * Request body:
 * {
 *   questionPages: Array<{ pageNumber: number; imageBlob: string (base64) }>,
 *   answerPages: Array<{ pageNumber: number; imageBlob: string (base64) }>
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   extractedText?: Array<{
 *     pageNumber: number,
 *     questionText: string,
 *     answerText: string,
 *     explanationText?: string
 *   }>,
 *   processingTimeMs?: number
 * }
 *
 * Related Documentation:
 * - Original Server Action: app/_actions/pdfBatchOcr.ts (processDualPdfBatchOcr)
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
		const { questionPages, answerPages } = body;

		// 3. Input validation
		if (!questionPages || !Array.isArray(questionPages)) {
			return NextResponse.json(
				{ error: "Bad request", message: "questionPages配列が必要です" },
				{ status: 400 },
			);
		}

		if (!answerPages || !Array.isArray(answerPages)) {
			return NextResponse.json(
				{ error: "Bad request", message: "answerPages配列が必要です" },
				{ status: 400 },
			);
		}

		if (questionPages.length === 0) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "少なくとも1つの問題ページが必要です",
				},
				{ status: 400 },
			);
		}

		if (questionPages.length > 50 || answerPages.length > 50) {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "一度に処理できるページは最大50枚です",
				},
				{ status: 400 },
			);
		}

		// 4. Process dual PDF batch OCR
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

		// Convert base64 to Blob and upload
		const convertAndUpload = async (
			pages: Array<{ pageNumber: number; imageBlob: string }>,
			type: "question" | "answer",
		) => {
			return Promise.all(
				pages.map(async ({ pageNumber, imageBlob }) => {
					const base64Data = imageBlob.split(",")[1] || imageBlob;
					const binaryString = Buffer.from(base64Data, "base64");
					const blob = new Blob([binaryString], { type: "image/png" });

					const uploadResult = await client.uploadFile?.(blob, {
						mimeType: blob.type || "image/png",
					});

					if (!uploadResult) {
						throw new Error(
							`File upload failed for ${type} page ${pageNumber}`,
						);
					}

					return {
						pageNumber,
						uri: uploadResult.uri,
						mimeType: uploadResult.mimeType,
						type,
					};
				}),
			);
		};

		const [questionFiles, answerFiles] = await Promise.all([
			convertAndUpload(questionPages, "question"),
			convertAndUpload(answerPages, "answer"),
		]);

		// Create file URIs arrays
		const questionFileUris = questionFiles.map(({ uri, mimeType }) => ({
			uri,
			mimeType,
		}));

		const answerFileUris = answerFiles.map(({ uri, mimeType }) => ({
			uri,
			mimeType,
		}));

		// High-quality dual PDF OCR prompt
		const systemPrompt = `以下の画像セットから学習カード用の問題・解答・解説を抽出してください。

画像構成:
- 最初の${questionFileUris.length}枚: 問題PDF（問題文が記載）
- 次の${answerFileUris.length}枚: 解答PDF（解答と解説が記載）

出力形式（JSON）:
[
  {
    "pageNumber": 1,
    "questionText": "問題文（選択肢も含む）",
    "answerText": "正解（簡潔に）",
    "explanationText": "詳細な解説（なぜその答えになるか、重要なポイント、覚えるべき知識）"
  }
]

抽出ルール:
1. **問題文**: 問題番号は除去し、本文と選択肢を含める
2. **解答**: 正解を簡潔に記載（例：「エ」「4」「TCP/IP」）
3. **解説**: 以下を含む詳細な説明を作成：
   - なぜその答えが正しいのか
   - 間違いの選択肢がなぜ違うのか
   - 関連する重要な概念や知識
   - 覚えるべきポイント
   - 類似問題への応用

品質基準:
- 解説は学習者が理解しやすいよう具体的に記載
- 専門用語には簡潔な説明を併記
- 解答根拠を論理的に説明
- 実務での応用例も含める（可能な場合）

注意事項:
- ページ番号は問題PDFの順序に従って設定
- 解答が見つからない問題はanswerTextを空文字列に
- 解説が不十分な場合は問題文から推測して補完
- 数式や図表の内容も可能な限りテキスト化`;

		const fullPrompt = `${systemPrompt}

【問題PDF】
以下は問題PDFの画像です（${questionFileUris.length}枚）

【解答PDF】
以下は解答PDFの画像です（${answerFileUris.length}枚）`;

		// Combine all file URIs
		const allFileUris = [...questionFileUris, ...answerFileUris];

		let jsonString = await client.generateWithFiles?.(fullPrompt, allFileUris);

		if (!jsonString) {
			return NextResponse.json(
				{
					error: "Processing failed",
					message: "デュアルPDF OCR処理に失敗しました",
				},
				{ status: 500 },
			);
		}

		// Enhanced JSON extraction
		let parsed: Array<{
			pageNumber: number;
			questionText: string;
			answerText: string;
			explanationText?: string;
		}> = [];

		try {
			// Extract JSON from response
			const fencePattern = /```(?:json)?\s*?\n([\s\S]*?)```/g;
			const fenceMatches = [...jsonString.matchAll(fencePattern)];

			if (fenceMatches.length > 0) {
				const jsonCandidates = fenceMatches.map((match) => match[1].trim());
				jsonString = jsonCandidates.reduce((longest, current) =>
					current.length > longest.length ? current : longest,
				);
			} else {
				const start = jsonString.indexOf("[");
				const end = jsonString.lastIndexOf("]");
				if (start !== -1 && end !== -1 && end > start) {
					jsonString = jsonString.slice(start, end + 1);
				}
			}

			// Clean up control characters
			jsonString = jsonString
				// biome-ignore lint/suspicious/noControlCharactersInRegex: Required for control character removal
				.replace(/[\x00-\x1f\x7f]/g, "")
				.replace(/\\/g, "\\\\")
				.replace(/"/g, '"')
				.replace(/"/g, '"')
				.replace(/'/g, "'")
				.replace(/'/g, "'")
				.trim();

			parsed = JSON.parse(jsonString);
		} catch (_parseError) {
			// Fallback: return empty array
			parsed = [];
		}

		// Convert result
		const extractedText = parsed
			.filter(
				(item) => item.questionText && item.questionText.trim().length > 0,
			)
			.map((item) => ({
				pageNumber: item.pageNumber,
				questionText: item.questionText.trim(),
				answerText: item.answerText?.trim() || "",
				explanationText: item.explanationText?.trim() || "",
			}));

		const processingTimeMs = Date.now() - startTime;

		return NextResponse.json({
			success: true,
			message: `デュアルPDF処理で${extractedText.length}個の詳細な問題・解答・解説セットを生成しました`,
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
						: "デュアルPDF OCR処理中にエラーが発生しました",
				processingTimeMs: Date.now() - startTime,
			},
			{ status: 500 },
		);
	}
}
