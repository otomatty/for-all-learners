/**
 * 画像OCR処理専用カスタムフック
 * ローディング状態、プログレス、エラーハンドリングを統合管理
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { processGyazoImageOcr } from "@/app/_actions/transcribeImage";

// Server Action用の結果型
export interface ServerOcrResult {
	success: boolean;
	text: string;
	confidence?: number;
	error?: string;
}

// 互換性のためのOcrResult型定義
export interface OcrResult {
	success: boolean;
	text: string;
	confidence?: number;
	processingTime?: number;
	error?: string;
	warnings?: string[];
}

// プログレス表示用（簡略化）
export interface OcrProcessingEvent {
	stage: "preprocessing" | "recognizing" | "completed" | "error";
	progress: number;
	message: string;
}

export interface UseImageOcrOptions {
	language?: string;
	maxImageSize?: number;
	imageQuality?: number;
	enableProgress?: boolean;
	showToasts?: boolean;
	onComplete?: (result: OcrResult) => void;
	onError?: (error: string) => void;
}

export interface UseImageOcrReturn {
	processImage: (imageUrl: string) => Promise<OcrResult | null>;
	isProcessing: boolean;
	progress: number;
	currentStage: string;
	error: string | null;
	lastResult: OcrResult | null;
	clearError: () => void;
	clearResult: () => void;
	cancel: () => void;
}

/**
 * 画像OCR処理カスタムフック
 */
export function useImageOcr(
	options: UseImageOcrOptions = {},
): UseImageOcrReturn {
	const {
		language = "jpn+eng",
		maxImageSize = 1024,
		imageQuality = 0.9,
		enableProgress = true,
		showToasts = true,
		onComplete,
		onError,
	} = options;

	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState(0);
	const [currentStage, setCurrentStage] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [lastResult, setLastResult] = useState<OcrResult | null>(null);
	const [cancelRequested, setCancelRequested] = useState(false);

	const processImage = useCallback(
		async (imageUrl: string): Promise<OcrResult | null> => {
			if (isProcessing) {
				console.warn("[useImageOcr] OCR is already in progress");
				return null;
			}

			// 状態をリセット
			setIsProcessing(true);
			setProgress(0);
			setCurrentStage("準備中...");
			setError(null);
			setLastResult(null);
			setCancelRequested(false);

			// 成功時のトースト
			let loadingToastId: string | number | undefined;
			if (showToasts) {
				loadingToastId = toast.loading("画像からテキストを抽出中...", {
					description: "サーバーで処理中です",
				});
			}

			try {
				// プログレス表示（擬似的な進捗）
				setProgress(10);
				setCurrentStage("画像を取得中...");

				console.log("[useImageOcr] Starting OCR processing for:", imageUrl);

				// 処理中の進捗表示
				const progressInterval = setInterval(() => {
					setProgress((prev) => {
						if (prev < 80) return prev + 10;
						return prev;
					});
				}, 500);

				// Server Actionを呼び出し
				setCurrentStage("OCR処理中...");
				const serverResult = await processGyazoImageOcr(imageUrl);

				clearInterval(progressInterval);

				if (cancelRequested) {
					console.log("[useImageOcr] OCR was cancelled");
					return null;
				}

				// 結果を互換性のある形式に変換
				const result: OcrResult = {
					success: serverResult.success,
					text: serverResult.text,
					confidence: serverResult.confidence,
					processingTime: 0, // サーバーサイドでは計測していない
					error: serverResult.error,
					warnings:
						!serverResult.success && serverResult.error
							? [serverResult.error]
							: undefined,
				};

				setLastResult(result);

				if (result.success) {
					// 成功処理
					setProgress(100);
					setCurrentStage("完了");

					if (showToasts && loadingToastId) {
						toast.dismiss(loadingToastId);

						const previewText =
							result.text.length > 50
								? `${result.text.substring(0, 50)}...`
								: result.text;

						toast.success("テキスト抽出完了", {
							description:
								result.text.length > 0
									? `抽出されたテキスト: ${previewText}`
									: "テキストが検出されませんでした",
							duration: 4000,
						});
					}

					// 完了コールバック
					if (onComplete) {
						onComplete(result);
					}

					console.log("[useImageOcr] OCR completed successfully:", {
						textLength: result.text.length,
						confidence: result.confidence,
					});
				} else {
					// エラー処理
					const errorMessage = result.error || "OCR処理に失敗しました";
					setError(errorMessage);

					if (showToasts && loadingToastId) {
						toast.dismiss(loadingToastId);
						toast.error("テキスト抽出に失敗", {
							description: errorMessage,
							duration: 5000,
						});
					}

					if (onError) {
						onError(errorMessage);
					}

					console.error("[useImageOcr] OCR failed:", errorMessage);
				}

				return result;
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: "OCR処理中に予期しないエラーが発生しました";

				setError(errorMessage);
				setProgress(0);
				setCurrentStage("エラー");

				if (showToasts && loadingToastId) {
					toast.dismiss(loadingToastId);
					toast.error("OCR処理エラー", {
						description: errorMessage,
						duration: 5000,
					});
				}

				if (onError) {
					onError(errorMessage);
				}

				console.error("[useImageOcr] Unexpected error:", err);
				return null;
			} finally {
				setIsProcessing(false);
				setCancelRequested(false);
			}
		},
		[isProcessing, showToasts, onComplete, onError, cancelRequested],
	);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const clearResult = useCallback(() => {
		setLastResult(null);
		setProgress(0);
		setCurrentStage("");
	}, []);

	const cancel = useCallback(() => {
		if (isProcessing) {
			setCancelRequested(true);
			setCurrentStage("キャンセル中...");

			if (showToasts) {
				toast.info("OCR処理をキャンセルしています...");
			}
		}
	}, [isProcessing, showToasts]);

	return {
		processImage,
		isProcessing,
		progress,
		currentStage,
		error,
		lastResult,
		clearError,
		clearResult,
		cancel,
	};
}

/**
 * クイックOCR処理ヘルパー（シンプルな用途向け）
 */
export function useQuickImageOcr() {
	const [isLoading, setIsLoading] = useState(false);

	const quickProcess = useCallback(
		async (
			imageUrl: string,
			onSuccess: (text: string) => void,
			onError?: (error: string) => void,
		) => {
			setIsLoading(true);

			try {
				const result = await processGyazoImageOcr(imageUrl);

				if (result.success && result.text.length > 0) {
					onSuccess(result.text);
					toast.success("テキスト抽出完了");
				} else {
					const error = result.error || "テキストが検出されませんでした";
					if (onError) onError(error);
					toast.error(error);
				}
			} catch (err) {
				const error =
					err instanceof Error ? err.message : "OCR処理に失敗しました";
				if (onError) onError(error);
				toast.error(error);
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	return {
		quickProcess,
		isLoading,
	};
}
