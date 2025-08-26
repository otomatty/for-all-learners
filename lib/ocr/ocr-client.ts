/**
 * クライアントサイドOCRメイン処理
 * 画像前処理とTesseract.js統合
 */

import {
	type ImageProcessingOptions,
	processImageForOcr,
} from "./image-processor";
import { type OcrProgress, recognizeText } from "./tesseract-worker";

export interface OcrOptions {
	language?: string;
	maxImageSize?: number;
	imageQuality?: number;
	preprocessingLevel?: "basic" | "enhanced";
	enableProgress?: boolean;
}

export interface OcrResult {
	success: boolean;
	text: string;
	confidence: number;
	processingTime: number;
	imageInfo?: {
		originalSize: number;
		processedSize: number;
		compressionRatio: number;
		dimensions: { width: number; height: number };
	};
	error?: string;
	warnings?: string[];
}

export interface OcrProcessingEvent {
	stage:
		| "preprocessing"
		| "initializing"
		| "recognizing"
		| "completed"
		| "error";
	progress: number;
	message: string;
	details?: unknown;
}

/**
 * クライアントサイドOCR処理のデフォルト設定
 */
const DEFAULT_OPTIONS: Required<OcrOptions> = {
	language: "jpn+eng",
	maxImageSize: 1024,
	imageQuality: 0.9,
	preprocessingLevel: "basic",
	enableProgress: true,
};

/**
 * クライアントサイドOCR処理の名前空間
 */
export namespace ClientOcr {
	/**
	 * 画像からテキストを抽出
	 */
	export async function processImage(
		imageUrl: string,
		options: OcrOptions = {},
		onProgress?: (event: OcrProcessingEvent) => void,
	): Promise<OcrResult> {
		const opts = { ...DEFAULT_OPTIONS, ...options };
		const startTime = Date.now();
		const warnings: string[] = [];

		try {
			// プログレス通知
			const notifyProgress = (event: OcrProcessingEvent) => {
				if (opts.enableProgress && onProgress) {
					onProgress(event);
				}
			};

			// バリデーション
			if (!imageUrl || typeof imageUrl !== "string") {
				throw new Error("Invalid image URL provided");
			}

			if (!isValidImageUrl(imageUrl)) {
				throw new Error("Unsupported image URL format");
			}

			// Stage 1: 画像前処理
			notifyProgress({
				stage: "preprocessing",
				progress: 10,
				message: "画像を最適化中...",
			});

			const imageProcessingOptions: ImageProcessingOptions = {
				maxWidth: opts.maxImageSize,
				maxHeight: opts.maxImageSize,
				quality: opts.imageQuality,
				format: "jpeg",
			};

			const processedImage = await processImageForOcr(
				imageUrl,
				imageProcessingOptions,
			);

			// 圧縮効果のチェック
			if (processedImage.compressionRatio < 0.5) {
				warnings.push(
					"画像が大幅に圧縮されました。OCR精度に影響する可能性があります。",
				);
			}

			if (processedImage.width < 200 || processedImage.height < 200) {
				warnings.push(
					"画像サイズが小さすぎます。OCR精度が低下する可能性があります。",
				);
			}

			// Stage 2: OCR処理
			notifyProgress({
				stage: "initializing",
				progress: 30,
				message: "OCRエンジンを初期化中...",
			});

			const ocrProgress = (progress: OcrProgress) => {
				const overallProgress = 30 + progress.progress * 0.6; // 30-90%
				notifyProgress({
					stage: "recognizing",
					progress: overallProgress,
					message: progress.message,
					details: progress,
				});
			};

			const ocrResult = await recognizeText(
				processedImage.blob,
				opts.language,
				ocrProgress,
			);

			// 結果の後処理
			const cleanedText = postProcessText(ocrResult.text);

			// 信頼度チェック
			if (ocrResult.confidence < 30) {
				warnings.push("OCR信頼度が低いです。結果を確認してください。");
			}

			if (cleanedText.length === 0) {
				warnings.push(
					"テキストが検出されませんでした。画像に文字が含まれているか確認してください。",
				);
			}

			const totalProcessingTime = Date.now() - startTime;

			// Stage 3: 完了
			notifyProgress({
				stage: "completed",
				progress: 100,
				message: "OCR処理が完了しました",
			});

			const result: OcrResult = {
				success: true,
				text: cleanedText,
				confidence: ocrResult.confidence,
				processingTime: totalProcessingTime,
				imageInfo: {
					originalSize: processedImage.originalSize,
					processedSize: processedImage.processedSize,
					compressionRatio: processedImage.compressionRatio,
					dimensions: {
						width: processedImage.width,
						height: processedImage.height,
					},
				},
				warnings: warnings.length > 0 ? warnings : undefined,
			};

			console.log("[ClientOCR] Processing completed:", {
				textLength: cleanedText.length,
				confidence: ocrResult.confidence,
				processingTime: totalProcessingTime,
				warnings: warnings.length,
			});

			return result;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown OCR error";

			console.error("[ClientOCR] Processing failed:", error);

			if (onProgress) {
				onProgress({
					stage: "error",
					progress: 0,
					message: `エラーが発生しました: ${errorMessage}`,
				});
			}

			return {
				success: false,
				text: "",
				confidence: 0,
				processingTime: Date.now() - startTime,
				error: errorMessage,
				warnings: warnings.length > 0 ? warnings : undefined,
			};
		}
	}

	/**
	 * 画像URLの形式をバリデーション
	 */
	function isValidImageUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);

			// Gyazo画像URLの検証
			if (
				urlObj.hostname === "i.gyazo.com" ||
				urlObj.hostname === "gyazo.com"
			) {
				return true;
			}

			// その他の一般的な画像URLパターン
			const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i;
			return imageExtensions.test(urlObj.pathname);
		} catch {
			return false;
		}
	}

	/**
	 * 制御文字を除去するヘルパー関数
	 */
	function removeControlCharacters(text: string): string {
		return text
			.split("")
			.filter((char) => {
				const code = char.charCodeAt(0);
				// ASCII制御文字 (0-31, 127) を除去
				return !(code <= 31 || code === 127);
			})
			.join("");
	}

	/**
	 * OCR結果のテキスト後処理
	 */
	function postProcessText(text: string): string {
		if (!text) return "";

		let processedText = text
			// 余分な空白を除去
			.replace(/\s+/g, " ")
			// 行頭・行末の空白を除去
			.trim()
			// 全角数字を半角に
			.replace(/[０-９]/g, (match) =>
				String.fromCharCode(match.charCodeAt(0) - 0xfee0),
			)
			// 連続する同じ文字を制限（明らかな誤認識）
			.replace(/(.)\1{5,}/g, "$1$1$1");

		// OCRテーブル自動変換の適用
		try {
			const { autoConvertOcrToTable } = require("../utils/ocrTableProcessor");
			processedText = autoConvertOcrToTable(processedText, {
				debug: false,
				autoAdjustColumns: true,
			});
		} catch (error) {
			console.warn("[OCR] テーブル変換でエラー:", error);
			// エラーが発生しても元のテキストを保持
		}

		// 制御文字を除去
		return removeControlCharacters(processedText);
	}

	/**
	 * OCR処理の推定時間を計算
	 */
	export function estimateProcessingTime(imageSize: number): number {
		// MB単位での推定時間（秒）
		const sizeMB = imageSize / (1024 * 1024);

		if (sizeMB < 0.5) return 3;
		if (sizeMB < 1) return 5;
		if (sizeMB < 2) return 8;
		if (sizeMB < 5) return 12;
		return 15;
	}

	/**
	 * システムのOCR対応チェック
	 */
	export async function checkSupport(): Promise<{
		supported: boolean;
		webAssembly: boolean;
		workers: boolean;
		canvas: boolean;
		issues: string[];
	}> {
		const issues: string[] = [];

		const webAssembly = (() => {
			try {
				return (
					typeof WebAssembly === "object" &&
					WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]))
				);
			} catch {
				issues.push("WebAssembly is not supported");
				return false;
			}
		})();

		const workers = (() => {
			try {
				return typeof Worker !== "undefined";
			} catch {
				issues.push("Web Workers are not supported");
				return false;
			}
		})();

		const canvas = (() => {
			try {
				const canvas = document.createElement("canvas");
				return !!canvas.getContext?.("2d");
			} catch {
				issues.push("Canvas 2D is not supported");
				return false;
			}
		})();

		const supported = webAssembly && workers && canvas;

		return {
			supported,
			webAssembly,
			workers,
			canvas,
			issues,
		};
	}
}
