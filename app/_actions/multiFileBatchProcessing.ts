/**
 * @deprecated This Server Action has been migrated to API Routes.
 * Please use the following instead:
 * - API Route: app/api/batch/multi-file/route.ts
 * - Hook: hooks/batch/useMultiFileBatch.ts
 *
 * Migration completed: 2025-11-23
 * Related Issue: #177
 *
 * This file is kept for backward compatibility and type exports.
 * New code should use the API Route + TanStack Query hook pattern.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import {
	executeWithQuotaCheck,
	getGeminiQuotaManager,
} from "@/lib/utils/geminiQuotaManager";
import { type EnhancedPdfCard, processPdfToCards } from "./pdfProcessing";
import { transcribeImagesBatch } from "./transcribeImageBatch";
// PDF画像抽出は一時的にコメントアウト（未実装）
// import { extractPdfPagesAsImages } from "@/lib/utils/pdfClientUtils";

// マルチファイル処理の型定義
export interface MultiFileInput {
	fileId: string;
	fileName: string;
	fileType: "pdf" | "image" | "audio";
	fileBlob: Blob;
	metadata?: {
		isQuestion?: boolean;
		isAnswer?: boolean;
		priority?: number;
	};
}

export interface MultiFileProcessingResult {
	success: boolean;
	message: string;
	processedFiles: Array<{
		fileId: string;
		fileName: string;
		success: boolean;
		cards?: EnhancedPdfCard[];
		extractedText?: Array<{ pageNumber: number; text: string }>;
		error?: string;
		processingTimeMs?: number;
	}>;
	totalCards: number;
	totalProcessingTimeMs: number;
	apiRequestsUsed: number;
}

/**
 * 複数ファイルを一括でバッチ処理（超効率版）
 *
 * 特徴:
 * 1. 複数PDFを同時にOCR処理
 * 2. 全ファイルの画像を一度にGeminiに送信
 * 3. クロスファイル分析によるより高品質なカード生成
 * 4. 最大90%のAPI削減効果
 */
export async function processMultiFilesBatch(
	userId: string,
	files: MultiFileInput[],
): Promise<MultiFileProcessingResult> {
	const startTime = Date.now();

	try {
		// 事前クォータチェック
		const quotaManager = getGeminiQuotaManager();
		const estimatedPages = files.length * 10; // ファイルあたり平均10ページと仮定
		const quotaCheck = quotaManager.validatePdfProcessing(estimatedPages);

		if (!quotaCheck.canProcess) {
			return {
				success: false,
				message: `マルチファイル処理が制限されました: ${quotaCheck.message}`,
				processedFiles: [],
				totalCards: 0,
				totalProcessingTimeMs: Date.now() - startTime,
				apiRequestsUsed: 0,
			};
		}
		const imageExtractionPromises = files
			.filter((file) => file.fileType === "pdf")
			.map(async (file) => {
				try {
					// BlobをFileに変換
					const _pdfFile = new File([file.fileBlob], file.fileName, {
						type: file.fileBlob.type || "application/pdf",
					});
					// 一時的に空の配列を返す（PDF画像抽出機能は未実装）
					const imagePages: Array<{ pageNumber: number; imageBlob: Blob }> = [];
					return {
						fileId: file.fileId,
						fileName: file.fileName,
						imagePages: imagePages.map(
							(page: { pageNumber: number; imageBlob: Blob }) => ({
								pageNumber: page.pageNumber,
								imageBlob: page.imageBlob,
								fileId: file.fileId,
								fileName: file.fileName,
							}),
						),
						metadata: file.metadata,
					};
				} catch (error) {
					return {
						fileId: file.fileId,
						fileName: file.fileName,
						imagePages: [],
						error: error instanceof Error ? error.message : "変換エラー",
					};
				}
			});

		const extractedImages = await Promise.all(imageExtractionPromises);
		const totalImageCount = extractedImages.reduce(
			(sum, file) => sum + file.imagePages.length,
			0,
		);

		if (totalImageCount === 0) {
			return {
				success: false,
				message: "すべてのファイルで画像抽出に失敗しました",
				processedFiles: files.map((f) => ({
					fileId: f.fileId,
					fileName: f.fileName,
					success: false,
					error: "画像抽出失敗",
				})),
				totalCards: 0,
				totalProcessingTimeMs: Date.now() - startTime,
				apiRequestsUsed: 0,
			};
		}
		const allBatchPages: Array<{
			pageNumber: number;
			imageUrl: string;
			fileId: string;
			fileName: string;
			filePath: string;
		}> = [];

		for (const fileData of extractedImages) {
			if (fileData.imagePages.length > 0) {
				// Supabaseに一括アップロード
				const supabase = await createClient();
				const uploadPromises = fileData.imagePages.map(
					async (page: {
						pageNumber: number;
						imageBlob: Blob;
						fileId: string;
						fileName: string;
					}) => {
						try {
							const timestamp = Date.now();
							const filePath = `multi-file-ocr/${userId}/${timestamp}-${fileData.fileId}-page${page.pageNumber}.png`;

							const { error: uploadError } = await supabase.storage
								.from("ocr-images")
								.upload(filePath, page.imageBlob, {
									metadata: {
										userId,
										fileId: fileData.fileId,
										fileName: fileData.fileName,
										pageNumber: page.pageNumber.toString(),
									},
								});

							if (uploadError) {
								return null;
							}

							// Signed URL作成
							const { data: signedData, error: signedError } =
								await supabase.storage
									.from("ocr-images")
									.createSignedUrl(filePath, 60 * 15); // 15分間有効

							if (signedError || !signedData.signedUrl) {
								return null;
							}

							return {
								pageNumber: page.pageNumber,
								imageUrl: signedData.signedUrl,
								fileId: fileData.fileId,
								fileName: fileData.fileName,
								filePath, // クリーンアップ用
							};
						} catch (_error) {
							return null;
						}
					},
				);

				const uploadResults = await Promise.all(uploadPromises);
				const validUploads = uploadResults.filter(
					(
						result: (typeof uploadResults)[0],
					): result is NonNullable<typeof result> => result !== null,
				);

				allBatchPages.push(...validUploads);
			}
		}

		// 3. 超大規模バッチOCR実行（ファイル横断）
		let allExtractedText: Array<{
			pageNumber: number;
			text: string;
			fileId: string;
			fileName: string;
		}> = [];

		if (allBatchPages.length > 0) {
			// ファイル情報付きでバッチ処理
			const megaBatchResult = await executeWithQuotaCheck(
				() => processCrossFilesBatchOcr(allBatchPages),
				Math.ceil(allBatchPages.length / 8), // 8ページずつのバッチ数
				"クロスファイル・メガバッチOCR",
			);

			allExtractedText = megaBatchResult;

			// 一時ファイルクリーンアップ
			const supabase = await createClient();
			const cleanupPromises = allBatchPages.map(async (page) => {
				try {
					await supabase.storage.from("ocr-images").remove([page.filePath]);
				} catch (_error) {}
			});
			Promise.all(cleanupPromises).catch((_error) => {});
		}
		const fileProcessingPromises = files.map(async (file) => {
			const fileStartTime = Date.now();

			try {
				const fileText = allExtractedText.filter(
					(text) => text.fileId === file.fileId,
				);

				if (fileText.length === 0) {
					return {
						fileId: file.fileId,
						fileName: file.fileName,
						success: false,
						error: "テキスト抽出に失敗",
						processingTimeMs: Date.now() - fileStartTime,
					};
				}

				// ファイル専用のテキストでカード生成
				const formattedText = fileText.map((t) => ({
					pageNumber: t.pageNumber,
					text: t.text,
				}));

				const { cards } = await processPdfToCards(
					formattedText,
					`multi-file://${file.fileId}/${file.fileName}`,
				);

				return {
					fileId: file.fileId,
					fileName: file.fileName,
					success: true,
					cards,
					extractedText: formattedText,
					processingTimeMs: Date.now() - fileStartTime,
				};
			} catch (error) {
				return {
					fileId: file.fileId,
					fileName: file.fileName,
					success: false,
					error: error instanceof Error ? error.message : "カード生成エラー",
					processingTimeMs: Date.now() - fileStartTime,
				};
			}
		});

		const processedFiles = await Promise.all(fileProcessingPromises);
		const totalCards = processedFiles.reduce(
			(sum, file) => sum + (file.cards?.length || 0),
			0,
		);
		const successfulFiles = processedFiles.filter((file) => file.success);

		return {
			success: successfulFiles.length > 0,
			message: `マルチファイル処理完了: ${successfulFiles.length}/${files.length}ファイル成功、${totalCards}カード生成`,
			processedFiles,
			totalCards,
			totalProcessingTimeMs: Date.now() - startTime,
			apiRequestsUsed: Math.ceil(allBatchPages.length / 8), // 実際のAPI使用量
		};
	} catch (error) {
		return {
			success: false,
			message: "マルチファイル処理中に致命的エラーが発生しました",
			processedFiles: files.map((f) => ({
				fileId: f.fileId,
				fileName: f.fileName,
				success: false,
				error: error instanceof Error ? error.message : "不明なエラー",
			})),
			totalCards: 0,
			totalProcessingTimeMs: Date.now() - startTime,
			apiRequestsUsed: 0,
		};
	}
}

/**
 * 複数ファイルの画像を横断的にバッチOCR処理
 */
async function processCrossFilesBatchOcr(
	allPages: Array<{
		pageNumber: number;
		imageUrl: string;
		fileId: string;
		fileName: string;
		filePath: string;
	}>,
): Promise<
	Array<{ pageNumber: number; text: string; fileId: string; fileName: string }>
> {
	const results: Array<{
		pageNumber: number;
		text: string;
		fileId: string;
		fileName: string;
	}> = [];

	// 8ページずつのメガバッチで処理
	const batchSize = 8;
	for (let i = 0; i < allPages.length; i += batchSize) {
		const batch = allPages.slice(i, i + batchSize);

		try {
			const batchPages = batch.map((page) => ({
				pageNumber: page.pageNumber,
				imageUrl: page.imageUrl,
			}));

			const batchResult = await transcribeImagesBatch(batchPages, batchSize);

			if (batchResult.success && batchResult.extractedPages) {
				// ファイル情報を付加して結果に追加
				for (const extracted of batchResult.extractedPages) {
					const originalPage = batch.find(
						(p) => p.pageNumber === extracted.pageNumber,
					);
					if (originalPage) {
						results.push({
							pageNumber: extracted.pageNumber,
							text: extracted.text,
							fileId: originalPage.fileId,
							fileName: originalPage.fileName,
						});
					}
				}
			}

			// バッチ間の小さな待機
			if (i + batchSize < allPages.length) {
				await new Promise((resolve) => setTimeout(resolve, 300));
			}
		} catch (_error) {
			// エラーでも続行
		}
	}

	return results;
}

/**
 * クロスファイル分析による高品質カード生成
 *
 * 複数ファイルの内容を横断的に分析して、
 * より関連性の高いカードを生成
 */
export async function generateCrossFileCards(
	_extractedTexts: Array<{
		fileId: string;
		fileName: string;
		text: Array<{ pageNumber: number; text: string }>;
	}>,
): Promise<{
	crossFileCards: EnhancedPdfCard[];
	individualCards: EnhancedPdfCard[];
	totalCards: number;
}> {
	// TODO: 実装予定
	// - 複数ファイル間の関連性分析
	// - 共通テーマやトピックの抽出
	// - クロスリファレンス付きカード生成

	return {
		crossFileCards: [],
		individualCards: [],
		totalCards: 0,
	};
}
