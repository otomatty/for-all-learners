"use server";

import {
	processMultiFilesBatch,
	type MultiFileInput,
} from "./multiFileBatchProcessing";
import {
	processAudioFilesBatch,
	type AudioBatchInput,
} from "./audioBatchProcessing";
import {
	transcribeImagesBatch,
	type BatchOcrPage,
} from "./transcribeImageBatch";
import { getGeminiQuotaManager } from "@/lib/utils/geminiQuotaManager";

// 統合バッチ処理の型定義
export type UnifiedBatchInput =
	| { type: "multi-file"; files: MultiFileInput[] }
	| { type: "audio-batch"; audioFiles: AudioBatchInput[] }
	| { type: "image-batch"; pages: BatchOcrPage[] };

export interface UnifiedBatchResult {
	success: boolean;
	message: string;
	batchType: "multi-file" | "audio-batch" | "image-batch";
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
	quotaStatus: {
		remaining: number;
		used: number;
		limit: number;
	};

	// バッチタイプ別の結果
	multiFileResult?: Awaited<ReturnType<typeof processMultiFilesBatch>>;
	audioBatchResult?: Awaited<ReturnType<typeof processAudioFilesBatch>>;
	imageBatchResult?: Awaited<ReturnType<typeof transcribeImagesBatch>>;
}

/**
 * 統合バッチプロセッサー - すべてのファイル種別を効率的に一括処理
 *
 * 特徴:
 * - 自動的に最適なバッチ処理を選択
 * - クォータ管理の統合
 * - 処理結果の統一フォーマット
 * - エラー回復と部分成功の対応
 */
export async function processUnifiedBatch(
	userId: string,
	batchInput: UnifiedBatchInput,
): Promise<UnifiedBatchResult> {
	const startTime = Date.now();

	// 事前クォータ確認
	const quotaManager = getGeminiQuotaManager();
	const quotaStatus = quotaManager.getQuotaStatus();

	try {
		console.log(`[統合バッチ処理] ${batchInput.type} 処理開始`);

		switch (batchInput.type) {
			case "multi-file": {
				console.log(
					`[統合バッチ処理] マルチファイル処理: ${batchInput.files.length}ファイル`,
				);

				const result = await processMultiFilesBatch(userId, batchInput.files);

				return {
					success: result.success,
					message: result.message,
					batchType: "multi-file",
					totalProcessingTimeMs: Date.now() - startTime,
					apiRequestsUsed: result.apiRequestsUsed,
					quotaStatus: quotaManager.getQuotaStatus(),
					multiFileResult: result,
				};
			}

			case "audio-batch": {
				console.log(
					`[統合バッチ処理] 音声バッチ処理: ${batchInput.audioFiles.length}ファイル`,
				);

				const result = await processAudioFilesBatch(
					userId,
					batchInput.audioFiles,
				);

				return {
					success: result.success,
					message: result.message,
					batchType: "audio-batch",
					totalProcessingTimeMs: Date.now() - startTime,
					apiRequestsUsed: result.apiRequestsUsed,
					quotaStatus: quotaManager.getQuotaStatus(),
					audioBatchResult: result,
				};
			}

			case "image-batch": {
				console.log(
					`[統合バッチ処理] 画像バッチ処理: ${batchInput.pages.length}ページ`,
				);

				const result = await transcribeImagesBatch(batchInput.pages);
				const apiRequestsUsed = Math.ceil(batchInput.pages.length / 4);

				return {
					success: result.success,
					message: result.message,
					batchType: "image-batch",
					totalProcessingTimeMs: Date.now() - startTime,
					apiRequestsUsed,
					quotaStatus: quotaManager.getQuotaStatus(),
					imageBatchResult: result,
				};
			}

			default:
				throw new Error(
					`未対応のバッチタイプ: ${(batchInput as UnifiedBatchInput).type}`,
				);
		}
	} catch (error) {
		console.error("統合バッチ処理エラー:", error);

		return {
			success: false,
			message: `統合バッチ処理でエラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
			batchType: batchInput.type,
			totalProcessingTimeMs: Date.now() - startTime,
			apiRequestsUsed: 0,
			quotaStatus: quotaManager.getQuotaStatus(),
		};
	}
}

/**
 * バッチ処理の最適化提案
 *
 * ファイル種別と数量から最適な処理方法を提案
 */
export function suggestOptimalBatchStrategy(
	files: Array<{ type: "pdf" | "image" | "audio"; size: number; name: string }>,
): {
	strategy: "multi-file" | "audio-batch" | "image-batch" | "mixed-batch";
	estimatedApiCalls: number;
	estimatedProcessingTime: number;
	recommendations: string[];
} {
	const pdfCount = files.filter((f) => f.type === "pdf").length;
	const audioCount = files.filter((f) => f.type === "audio").length;
	const imageCount = files.filter((f) => f.type === "image").length;

	const recommendations: string[] = [];
	let strategy: "multi-file" | "audio-batch" | "image-batch" | "mixed-batch";
	let estimatedApiCalls = 0;
	let estimatedProcessingTime = 0;

	if (pdfCount > 0 && audioCount === 0 && imageCount === 0) {
		// PDF のみ
		strategy = "multi-file";
		estimatedApiCalls = Math.ceil((pdfCount * 8) / 8); // 8ページずつ
		estimatedProcessingTime = pdfCount * 15; // PDF当たり15秒
		recommendations.push("PDF専用のマルチファイル処理が最適です");
	} else if (audioCount > 0 && pdfCount === 0 && imageCount === 0) {
		// 音声のみ
		strategy = "audio-batch";
		estimatedApiCalls = Math.ceil(audioCount / 3); // 3ファイルずつ
		estimatedProcessingTime = audioCount * 20; // 音声当たり20秒
		recommendations.push("音声専用のバッチ処理が最適です");
	} else if (imageCount > 0 && pdfCount === 0 && audioCount === 0) {
		// 画像のみ
		strategy = "image-batch";
		estimatedApiCalls = Math.ceil(imageCount / 4); // 4画像ずつ
		estimatedProcessingTime = imageCount * 3; // 画像当たり3秒
		recommendations.push("画像専用のバッチ処理が最適です");
	} else {
		// 混在
		strategy = "mixed-batch";
		estimatedApiCalls =
			Math.ceil((pdfCount * 8) / 8) +
			Math.ceil(audioCount / 3) +
			Math.ceil(imageCount / 4);
		estimatedProcessingTime = pdfCount * 15 + audioCount * 20 + imageCount * 3;
		recommendations.push("ファイル種別ごとに分けて処理することを推奨");
		recommendations.push("大量ファイルの場合は段階的に処理してください");
	}

	// 最適化の提案
	if (estimatedApiCalls > 50) {
		recommendations.push(
			"⚠️ API使用量が多くなります。ファイル数を減らすか分割処理を検討してください",
		);
	}

	if (estimatedProcessingTime > 300) {
		// 5分以上
		recommendations.push(
			"⏱️ 処理時間が長くなります。バックグラウンド処理の使用を推奨",
		);
	}

	const quotaManager = getGeminiQuotaManager();
	const quotaStatus = quotaManager.getQuotaStatus();

	if (quotaStatus.remaining < estimatedApiCalls) {
		recommendations.push(
			"❌ クォータが不足しています。明日またはファイル数を減らしてください",
		);
	}

	return {
		strategy,
		estimatedApiCalls,
		estimatedProcessingTime,
		recommendations,
	};
}

/**
 * バッチ処理のステータス監視
 */
export function getBatchProcessingStats(): {
	quotaStatus: {
		remaining: number;
		used: number;
		limit: number;
		resetTime: Date;
		canMakeRequest: boolean;
	};
	recommendedBatchSizes: {
		pdf: number;
		audio: number;
		image: number;
	};
	estimatedDailyCapacity: {
		pdfFiles: number;
		audioFiles: number;
		imageFiles: number;
	};
} {
	const quotaManager = getGeminiQuotaManager();
	const quotaStatus = quotaManager.getQuotaStatus();

	return {
		quotaStatus,
		recommendedBatchSizes: {
			pdf: 8, // 8ページずつ
			audio: 3, // 3ファイルずつ
			image: 4, // 4画像ずつ
		},
		estimatedDailyCapacity: {
			pdfFiles: Math.floor(quotaStatus.remaining / 2), // PDF当たり平均2リクエスト
			audioFiles: quotaStatus.remaining * 3, // 3ファイル当たり1リクエスト
			imageFiles: quotaStatus.remaining * 4, // 4画像当たり1リクエスト
		},
	};
}
