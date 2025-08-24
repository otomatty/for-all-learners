"use server";

import { geminiClient } from "@/lib/gemini/client";
import { executeWithQuotaCheck } from "@/lib/utils/geminiQuotaManager";
import { createPartFromUri, createUserContent } from "@google/genai";

// Define types for OCR response to avoid any
interface ImageOcrCandidate {
	parts: { text: string }[];
}
type ImageOcrContent = string | ImageOcrCandidate;
interface ImageOcrResponse {
	candidates?: { content: ImageOcrContent }[];
}

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
					console.warn(
						`[OCRリトライ] Gemini APIクォータ制限: ${delayMs}ms後にリトライ (${attempt}/${maxRetries})`,
					);
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
				console.warn(
					`[OCRリトライ] APIエラー (${error instanceof Error ? error.message : String(error)}): ${delayMs}ms後にリトライ (${attempt}/${maxRetries})`,
				);
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
		console.error("Gyazo OCR processing failed:", error);
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

	try {
		// 画像データを取得
		const res = await fetch(imageUrl);
		if (!res.ok) {
			throw new Error(`Failed to fetch image for OCR: ${res.status}`);
		}
		const arrayBuffer = await res.arrayBuffer();
		const blob = new Blob([arrayBuffer], {
			type: res.headers.get("content-type") ?? "image/png",
		});

		// Gemini Files API にアップロード
		const { uri, mimeType } = await geminiClient.files.upload({
			file: blob,
			config: { mimeType: blob.type },
		});
		if (!uri) throw new Error("Upload failed: missing URI");

		// 画像ファイル部分を準備
		const part = createPartFromUri(uri, mimeType ?? blob.type);
		const contents = createUserContent([
			"以下の画像からテキストを抽出してください。",
			part,
		]);

		// クォータチェック付きリトライロジックでGemini API呼び出し
		const responseRaw = await executeWithQuotaCheck(
			() =>
				callGeminiWithRetry(async () => {
					return await geminiClient.models.generateContent({
						model: "gemini-2.5-flash",
						contents,
					});
				}),
			1,
			"単一画像OCR処理",
		);

		const { candidates } = responseRaw as ImageOcrResponse;
		const candidate = candidates?.[0]?.content;
		if (!candidate) {
			throw new Error("OCR failed: no content returned");
		}

		let text: string;
		if (typeof candidate === "string") {
			text = candidate;
		} else if (
			typeof candidate === "object" &&
			Array.isArray((candidate as { parts: { text: string }[] }).parts)
		) {
			text = (candidate as { parts: { text: string }[] }).parts
				.map((p) => p.text)
				.join("");
		} else {
			text = String(candidate);
		}

		return text;
	} catch (error) {
		// エラーをより詳細にログ出力
		console.error("OCR処理エラー:", {
			error: error instanceof Error ? error.message : String(error),
			imageUrl: `${imageUrl.slice(0, 100)}...`, // URLは一部のみ表示
		});
		throw error;
	}
}
