"use server";

import { createPartFromUri, createUserContent } from "@google/genai";
import { geminiClient } from "@/lib/gemini/client";
import {
	executeWithQuotaCheck,
	getGeminiQuotaManager,
} from "@/lib/utils/geminiQuotaManager";

// バッチOCR処理の型定義
export interface BatchOcrPage {
	pageNumber: number;
	imageUrl: string;
}

export interface BatchOcrResult {
	success: boolean;
	message: string;
	extractedPages?: Array<{ pageNumber: number; text: string }>;
	error?: string;
	processedCount?: number;
	skippedCount?: number;
}

// リトライロジック付きGemini API呼び出し
async function callGeminiWithRetry<T>(
	apiCall: () => Promise<T>,
	maxRetries = 3,
	baseDelayMs = 1000,
): Promise<T> {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await apiCall();
		} catch (error: unknown) {
			// クォータエラー（429）の場合
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
				// 最後の試行またはretryDelayがない場合
				throw new Error(
					`Gemini APIクォータ制限に達しました。しばらく待ってから再試行してください。\n詳細: ${(error as unknown as Error).message}`,
				);
			}

			// その他のエラーの場合は指数バックオフでリトライ
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

// RetryDelay文字列をミリ秒に変換
function parseRetryDelay(retryDelayStr: string): number {
	// "12s" -> 12000ms, "1m" -> 60000ms など
	const match = retryDelayStr.match(/^(\d+)([sm]?)$/);
	if (!match) return 5000; // デフォルト5秒

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

/**
 * 複数の画像をバッチでOCR処理（効率化版）
 *
 * 最適化ポイント:
 * 1. 複数画像を1回のAPIコールで処理
 * 2. リトライロジック実装
 * 3. レート制限の考慮
 * 4. プログレッシブ処理（一部失敗でも続行）
 */
export async function transcribeImagesBatch(
	pages: BatchOcrPage[],
	batchSize = 4, // Geminiの同時画像処理制限を考慮
): Promise<BatchOcrResult> {
	try {
		// 事前クォータチェック
		const quotaManager = getGeminiQuotaManager();
		const _estimatedRequests = Math.ceil(pages.length / batchSize);
		const quotaCheck = quotaManager.validatePdfProcessing(pages.length);

		if (!quotaCheck.canProcess) {
			return {
				success: false,
				message: quotaCheck.message,
				error: quotaCheck.suggestion,
			};
		}

		if (quotaCheck.suggestion) {
		}

		const extractedPages: Array<{ pageNumber: number; text: string }> = [];
		let processedCount = 0;
		let skippedCount = 0;

		// バッチごとに分割処理
		for (let i = 0; i < pages.length; i += batchSize) {
			const batch = pages.slice(i, i + batchSize);
			const batchNumber = Math.floor(i / batchSize) + 1;
			const _totalBatches = Math.ceil(pages.length / batchSize);

			try {
				const batchResult = await executeWithQuotaCheck(
					() => processBatchWithRetry(batch),
					1, // 1バッチ = 1リクエスト
					`バッチ${batchNumber}OCR処理`,
				);

				extractedPages.push(...batchResult);
				processedCount += batchResult.length;

				// レート制限回避のため、バッチ間に小さな待機
				if (i + batchSize < pages.length) {
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			} catch (error: unknown) {
				skippedCount += batch.length;

				// クォータエラーの場合は即座に停止
				if (error instanceof Error && error.message.includes("クォータ")) {
					break;
				}

				// その他のエラーは続行
			}
		}

		if (extractedPages.length === 0) {
			return {
				success: false,
				message:
					"すべてのページでOCR処理に失敗しました。画像の品質やAPI制限を確認してください。",
				processedCount,
				skippedCount,
			};
		}

		return {
			success: true,
			message: `バッチOCR処理完了: ${processedCount}/${pages.length}ページ処理成功`,
			extractedPages,
			processedCount,
			skippedCount,
		};
	} catch (error) {
		return {
			success: false,
			message: "バッチOCR処理中に致命的エラーが発生しました",
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * 1バッチ（最大4ページ）を同時にOCR処理
 */
async function processBatchWithRetry(
	batch: BatchOcrPage[],
): Promise<Array<{ pageNumber: number; text: string }>> {
	// 各画像をGemini Files APIにアップロード
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

			const { uri, mimeType } = await geminiClient.files.upload({
				file: blob,
				config: { mimeType: blob.type },
			});

			if (!uri) throw new Error("アップロード失敗: URIが取得できませんでした");

			return {
				pageNumber: page.pageNumber,
				uri,
				mimeType: mimeType ?? blob.type,
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

	// バッチOCR処理用のプロンプト
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

	// 画像パーツを作成
	const imageParts = validUploads.map((upload) =>
		createPartFromUri(upload.uri, upload.mimeType),
	);

	const contents = createUserContent([systemPrompt, ...imageParts]);

	// リトライ付きでOCR実行
	const response = await callGeminiWithRetry(async () => {
		return await geminiClient.models.generateContent({
			model: "gemini-2.5-flash",
			contents,
		});
	});

	// レスポンス解析
	const { candidates } = response as { candidates?: { content: unknown }[] };
	const raw = candidates?.[0]?.content;
	if (!raw) {
		throw new Error("OCRレスポンスが空です");
	}

	let jsonString: string;
	if (typeof raw === "string") {
		jsonString = raw;
	} else if (
		typeof raw === "object" &&
		raw !== null &&
		"parts" in raw &&
		Array.isArray((raw as { parts: { text: string }[] }).parts)
	) {
		jsonString = (raw as { parts: { text: string }[] }).parts
			.map((p) => p.text)
			.join("");
	} else {
		jsonString = String(raw);
	}

	// JSON抽出
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

	try {
		const parsed = JSON.parse(jsonString);
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
			.filter((item) => item.text.length > 0); // 空文字は除外
	} catch (_parseError) {
		return await processPagesIndividually(validUploads);
	}
}

/**
 * バッチ処理失敗時のフォールバック: 個別処理
 */
async function processPagesIndividually(
	uploads: Array<{ pageNumber: number; uri: string; mimeType: string }>,
): Promise<Array<{ pageNumber: number; text: string }>> {
	const results: Array<{ pageNumber: number; text: string }> = [];

	for (const upload of uploads) {
		try {
			const part = createPartFromUri(upload.uri, upload.mimeType);
			const contents = createUserContent([
				"以下の画像からテキストを抽出してください。",
				part,
			]);

			const response = await callGeminiWithRetry(async () => {
				return await geminiClient.models.generateContent({
					model: "gemini-2.5-flash",
					contents,
				});
			});

			const { candidates } = response as {
				candidates?: { content: unknown }[];
			};
			const raw = candidates?.[0]?.content;

			let text = "";
			if (typeof raw === "string") {
				text = raw;
			} else if (
				typeof raw === "object" &&
				raw !== null &&
				"parts" in raw &&
				Array.isArray((raw as { parts: { text: string }[] }).parts)
			) {
				text = (raw as { parts: { text: string }[] }).parts
					.map((p) => p.text)
					.join("");
			}

			if (text.trim()) {
				results.push({
					pageNumber: upload.pageNumber,
					text: text.trim(),
				});
			}

			// 個別処理時は少し待機
			await new Promise((resolve) => setTimeout(resolve, 200));
		} catch (_error) {
			// エラーでも続行
		}
	}

	return results;
}
