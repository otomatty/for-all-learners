"use server";

import { createClient } from "@/lib/supabase/server";
import { transcribeImage } from "./transcribeImage";
import {
	type BatchOcrPage,
	transcribeImagesBatch,
} from "./transcribeImageBatch";

export interface PdfOcrResult {
	success: boolean;
	message: string;
	extractedText?: Array<{ pageNumber: number; text: string }>;
	error?: string;
}

export interface SinglePageOcrResult {
	success: boolean;
	message: string;
	text?: string;
	error?: string;
}

/**
 * PDF画像からOCRでテキストを抽出（バッチ処理版）
 *
 * @param userId - ユーザーID
 * @param imagePages - ページ番号と画像Blobのペア
 * @returns OCR結果
 */
export async function processPdfPagesWithOcr(
	userId: string,
	imagePages: Array<{ pageNumber: number; imageBlob: Blob }>,
): Promise<PdfOcrResult> {
	try {
		console.log(`[バッチOCR処理] ${imagePages.length}ページの画像を処理開始`);
		const supabase = await createClient();

		// 全ページをSupabaseストレージにアップロード
		const uploadPromises = imagePages.map(async ({ pageNumber, imageBlob }) => {
			try {
				const timestamp = Date.now();
				const filePath = `pdf-ocr-images/${userId}/${timestamp}-page${pageNumber}.png`;

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("ocr-images")
					.upload(filePath, imageBlob, {
						metadata: { userId, pageNumber: pageNumber.toString() },
					});

				if (uploadError) {
					console.error(
						`ページ ${pageNumber} のアップロードエラー:`,
						uploadError,
					);
					return null;
				}

				// Signed URL作成（10分間有効）
				const { data: signedData, error: signedError } = await supabase.storage
					.from("ocr-images")
					.createSignedUrl(filePath, 60 * 10);

				if (signedError || !signedData.signedUrl) {
					console.error(
						`ページ ${pageNumber} のSigned URL作成エラー:`,
						signedError,
					);
					return null;
				}

				return {
					pageNumber,
					imageUrl: signedData.signedUrl,
					filePath, // 後でクリーンアップ用
				};
			} catch (error) {
				console.error(`ページ ${pageNumber} のアップロード処理エラー:`, error);
				return null;
			}
		});

		const uploadResults = await Promise.all(uploadPromises);
		const validUploads = uploadResults.filter(
			(result): result is NonNullable<typeof result> => result !== null,
		);

		if (validUploads.length === 0) {
			return {
				success: false,
				message:
					"画像のアップロードに失敗しました。ネットワークまたはファイルサイズを確認してください。",
			};
		}

		console.log(
			`[バッチOCR処理] ${validUploads.length}/${imagePages.length}ページのアップロード完了`,
		);

		// バッチOCR処理実行
		const batchPages: BatchOcrPage[] = validUploads.map((upload) => ({
			pageNumber: upload.pageNumber,
			imageUrl: upload.imageUrl,
		}));

		const batchResult = await transcribeImagesBatch(batchPages, 4); // 4ページずつバッチ処理

		// 一時ファイルのクリーンアップ（非同期で実行）
		const cleanupPromises = validUploads.map(async (upload) => {
			try {
				await supabase.storage.from("ocr-images").remove([upload.filePath]);
			} catch (error) {
				console.warn(`ファイル削除エラー (${upload.filePath}):`, error);
			}
		});
		Promise.all(cleanupPromises).catch((error) =>
			console.warn("ファイルクリーンアップエラー:", error),
		);

		if (!batchResult.success || !batchResult.extractedPages) {
			return {
				success: false,
				message: `バッチOCR処理に失敗しました: ${batchResult.message}`,
				error: batchResult.error,
			};
		}

		const extractedText = batchResult.extractedPages;

		if (extractedText.length === 0) {
			return {
				success: false,
				message:
					"OCR処理でテキストを抽出できませんでした。画像の品質やAPI制限を確認してください。",
			};
		}

		console.log(
			`[バッチOCR処理] 成功: ${extractedText.length}/${imagePages.length}ページからテキスト抽出`,
		);

		return {
			success: true,
			message: `バッチOCR処理完了: ${extractedText.length}/${imagePages.length}ページからテキストを抽出しました`,
			extractedText,
		};
	} catch (error) {
		console.error("バッチOCR処理エラー:", error);

		// クォータエラーの場合は特別なメッセージ
		if (error instanceof Error && error.message.includes("クォータ制限")) {
			return {
				success: false,
				message:
					"Gemini APIのクォータ制限に達しました。しばらく時間をおいてから再試行してください。",
				error: error.message,
			};
		}

		return {
			success: false,
			message: "OCR処理中にエラーが発生しました",
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * 単一ページのPDF画像からOCRでテキストを抽出（サイズ制限回避版）
 *
 * @param userId - ユーザーID
 * @param imagePage - 単一ページの画像データ
 * @returns OCR結果
 */
export async function processSinglePageOcr(
	userId: string,
	imagePage: { pageNumber: number; imageBlob: Blob },
): Promise<SinglePageOcrResult> {
	const startTime = Date.now();
	try {
		console.log(`[OCR詳細] ページ${imagePage.pageNumber}: 処理開始`);
		const supabase = await createClient();
		const { pageNumber, imageBlob } = imagePage;

		// Supabaseストレージにアップロード
		const timestamp = Date.now();
		const filePath = `pdf-ocr-images/${userId}/${timestamp}-page${pageNumber}.png`;

		const uploadStart = Date.now();
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from("ocr-images")
			.upload(filePath, imageBlob, {
				metadata: { userId, pageNumber: pageNumber.toString() },
			});
		console.log(
			`[OCR詳細] ページ${pageNumber}: アップロード完了 (${Date.now() - uploadStart}ms)`,
		);

		if (uploadError) {
			return {
				success: false,
				message: `ページ ${pageNumber} のアップロードに失敗しました`,
				error: uploadError.message,
			};
		}

		// Signed URL作成（5分間有効）
		const signedStart = Date.now();
		const { data: signedData, error: signedError } = await supabase.storage
			.from("ocr-images")
			.createSignedUrl(filePath, 60 * 5);
		console.log(
			`[OCR詳細] ページ${pageNumber}: Signed URL作成完了 (${Date.now() - signedStart}ms)`,
		);

		if (signedError || !signedData.signedUrl) {
			return {
				success: false,
				message: `ページ ${pageNumber} のSigned URL作成に失敗しました`,
				error: signedError?.message,
			};
		}

		// OCR処理実行
		const ocrStart = Date.now();
		const ocrText = await transcribeImage(signedData.signedUrl);
		console.log(
			`[OCR詳細] ページ${pageNumber}: OCR処理完了 (${Date.now() - ocrStart}ms)`,
		);

		// 一時ファイル削除（ストレージ容量節約）
		await supabase.storage.from("ocr-images").remove([filePath]);

		if (!ocrText || ocrText.trim().length === 0) {
			return {
				success: false,
				message: `ページ ${pageNumber} からテキストを抽出できませんでした`,
			};
		}

		console.log(
			`[OCR詳細] ページ${pageNumber}: 総処理時間 (${Date.now() - startTime}ms)`,
		);
		return {
			success: true,
			message: `ページ ${pageNumber} から ${ocrText.length} 文字を抽出しました`,
			text: ocrText.trim(),
		};
	} catch (error: unknown) {
		console.error("単一ページOCR処理エラー:", error);

		// クォータエラーの場合は特別なメッセージ
		if (error instanceof Error && error.message.includes("クォータ制限")) {
			return {
				success: false,
				message:
					"Gemini APIのクォータ制限に達しました。しばらく時間をおいてから再試行してください。",
				error: error.message,
			};
		}

		return {
			success: false,
			message: "OCR処理中にエラーが発生しました",
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}
