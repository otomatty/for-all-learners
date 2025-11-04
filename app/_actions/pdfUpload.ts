"use server";

import { createClient } from "@/lib/supabase/server";
import type { EnhancedPdfCard } from "./pdfProcessing";
import { processPdfToCards, savePdfProcessingResult } from "./pdfProcessing";

export interface PdfUploadResult {
	success: boolean;
	message: string;
	pdfUrl?: string;
	extractedText?: Array<{ pageNumber: number; text: string }>;
	totalPages?: number;
	error?: string;
}

export interface PdfCardGenerationResult {
	success: boolean;
	message: string;
	cards?: EnhancedPdfCard[];
	totalCards?: number;
	processingTimeMs?: number;
	error?: string;
}

/**
 * PDFファイルをSupabase Storageにアップロード
 */
export async function uploadPdfToStorage(
	file: File,
	userId: string,
): Promise<PdfUploadResult> {
	try {
		// ファイルサイズチェック（50MB制限）
		const maxSizeBytes = 50 * 1024 * 1024;
		if (file.size > maxSizeBytes) {
			return {
				success: false,
				message: "ファイルサイズが大きすぎます（制限: 50MB）",
			};
		}

		// ファイルタイプチェック
		if (file.type !== "application/pdf") {
			return {
				success: false,
				message: "PDFファイルのみアップロード可能です",
			};
		}

		const supabase = await createClient();
		const timestamp = Date.now();
		const filePath = `pdf-uploads/${userId}/${timestamp}-${file.name}`;

		// Supabase Storageにアップロード
		const { error: uploadError } = await supabase.storage
			.from("pdf-files") // バケット名（事前に作成が必要）
			.upload(filePath, file, {
				metadata: {
					userId,
					originalName: file.name,
					uploadedAt: new Date().toISOString(),
				},
			});

		if (uploadError) {
			return {
				success: false,
				message: `アップロードに失敗しました: ${uploadError.message}`,
			};
		}

		// 署名付きURLを生成（24時間有効）
		const { data: signedData, error: signedError } = await supabase.storage
			.from("pdf-files")
			.createSignedUrl(filePath, 60 * 60 * 24); // 24時間

		if (signedError || !signedData.signedUrl) {
			return {
				success: false,
				message: "ファイルURLの生成に失敗しました",
			};
		}

		return {
			success: true,
			message: "PDFアップロードが完了しました",
			pdfUrl: signedData.signedUrl,
		};
	} catch (error) {
		return {
			success: false,
			message: "アップロード中にエラーが発生しました",
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * クライアントから受信したテキストデータを処理してカードを生成
 *
 * @param extractedText - クライアントサイドで抽出済みのテキストデータ
 * @param userId - ユーザーID
 * @param chunkSize - チャンクサイズ
 * @returns カード生成結果
 */
export async function processExtractedText(
	extractedText: Array<{ pageNumber: number; text: string }>,
	userId: string,
	chunkSize = 4000,
): Promise<PdfCardGenerationResult> {
	try {
		const result = await processPdfToCards(
			extractedText,
			"", // PDFファイルのURLは不要
			chunkSize,
		);

		// 処理結果を保存
		await savePdfProcessingResult(
			userId,
			"", // PDFファイルのURLは不要
			result.processingResult,
		);

		return {
			success: true,
			message: `${result.cards.length}個のカードを生成しました（解説付き高品質処理）`,
			cards: result.cards,
			totalCards: result.cards.length,
			processingTimeMs: result.processingResult.processingTimeMs,
		};
	} catch (error) {
		return {
			success: false,
			message: "テキスト処理中にエラーが発生しました",
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}

/**
 * 非推奨: 旧バージョンとの互換性のため残存
 * 新しい実装では processExtractedText を使用してください
 */
export async function processPdfFile(
	_file: File,
	_userId: string,
	_chunkSize = 4000,
): Promise<PdfCardGenerationResult> {
	return {
		success: false,
		message:
			"この関数は非推奨です。クライアントサイドでPDF処理を行ってからprocessExtractedTextを使用してください。",
		error: "DEPRECATED_FUNCTION",
	};
}

/**
 * 生成されたカードをデッキに保存
 */
export async function savePdfCardsToDeck(
	cards: EnhancedPdfCard[],
	deckId: string,
	userId: string,
): Promise<{ success: boolean; message: string; savedCount?: number }> {
	try {
		const supabase = await createClient();

		// カードデータを変換
		const cardsToInsert = cards.map((card) => ({
			user_id: userId,
			deck_id: deckId,
			front_content: card.front_content,
			back_content: card.back_content,
			source_pdf_url: card.source_pdf_url, // 新しいフィールド（マイグレーション必要）
		}));

		// バッチでカードを挿入
		const { data, error } = await supabase
			.from("cards")
			.insert(cardsToInsert)
			.select("id");

		if (error) {
			return {
				success: false,
				message: `カードの保存に失敗しました: ${error.message}`,
			};
		}

		return {
			success: true,
			message: `${data?.length || 0}個のカードを保存しました`,
			savedCount: data?.length || 0,
		};
	} catch (_error) {
		return {
			success: false,
			message: "カード保存中にエラーが発生しました",
		};
	}
}
