"use server";

import { createClientWithUserKey } from "@/lib/llm/factory";
import { executeWithQuotaCheck } from "@/lib/utils/geminiQuotaManager";

/**
 * リトライロジック付きGemini API呼び出し
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
					`Gemini APIのクォータ制限に達しました。しばらく待ってから再試行してください。\n詳細: ${error instanceof Error ? error.message : String(error)}`,
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

/**
 * RetryDelay文字列をミリ秒に変換
 */
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
 * Server action to extract text from an image via Gemini API.
 * リトライロジック付きで改良版。
 */
/**
 * Gyazo画像をOCR処理する（Server Action）
 * CORSの問題を回避するためにサーバーサイドで処理
 */
export async function processGyazoImageOcr(imageUrl: string): Promise<{
	success: boolean;
	text: string;
	confidence?: number;
	error?: string;
}> {
	try {
		// サーバーサイドで画像を取得（CORSの問題なし）
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}

		// 画像データをBase64に変換
		const arrayBuffer = await response.arrayBuffer();
		const base64Data = Buffer.from(arrayBuffer).toString("base64");
		const mimeType = response.headers.get("content-type") || "image/jpeg";
		const dataUrl = `data:${mimeType};base64,${base64Data}`;

		// 既存のtranscribeImage関数を使用
		const text = await transcribeImage(dataUrl);

		return {
			success: true,
			text,
			confidence: 95, // Geminiの信頼度は通常高い
		};
	} catch (error) {
		return {
			success: false,
			text: "",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function transcribeImage(imageUrl: string): Promise<string> {
	if (!imageUrl) {
		throw new Error("No image URL provided for transcription");
	}

	// Create dynamic LLM client
	const client = await createClientWithUserKey({ provider: "google" });

	// 画像データを取得
	const res = await fetch(imageUrl);
	if (!res.ok) {
		throw new Error(`Failed to fetch image for OCR: ${res.status}`);
	}
	const arrayBuffer = await res.arrayBuffer();
	const blob = new Blob([arrayBuffer], {
		type: res.headers.get("content-type") ?? "image/png",
	});

	// Upload file and check support
	if (!client.uploadFile || !client.generateWithFiles) {
		throw new Error("File upload is not supported by this provider");
	}

	// クォータチェック付きリトライロジックでGemini API呼び出し
	const text = await executeWithQuotaCheck(
		async () => {
			return await callGeminiWithRetry(async () => {
				const uploadResult = await client.uploadFile?.(blob, {
					mimeType: blob.type,
				});

				if (!uploadResult) {
					throw new Error("File upload failed: uploadResult is undefined");
				}

				const result = await client.generateWithFiles?.(
					"以下の画像からテキストを抽出してください。",
					[{ uri: uploadResult.uri, mimeType: uploadResult.mimeType }],
				);

				if (!result) {
					throw new Error("OCR generation failed: result is undefined");
				}

				return result;
			});
		},
		1,
		"単一画像OCR処理",
	);

	if (!text) {
		throw new Error("OCR failed: no text returned");
	}

	return text;
}
