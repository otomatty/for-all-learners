"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	processDualPdfBatchOcr,
	processLargeDualPdfInBatches,
} from "@/app/_actions/pdfBatchOcr";
import { generateCardsFromDualPdfData } from "@/app/_actions/pdfProcessing";
// PDF処理関数は一時的にコメントアウト（未実装）
// import {
// 	extractTextFromPdfWithFallback,
// 	extractPdfPagesAsImages,
// } from "@/lib/utils/pdfClientUtils";
import { processExtractedText } from "@/app/_actions/pdfUpload";
import type {
	GeneratedCard,
	ProcessingMode,
	ProcessingResult,
	ProcessingStatus,
	UsePdfProcessingReturn,
} from "@/types/pdf-card-generator";

export function usePdfProcessing(userId: string): UsePdfProcessingReturn {
	// クライアント環境チェック
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	// ファイル管理
	const [files, setFiles] = useState<File[]>([]);
	const [questionFileIndex, setQuestionFileIndex] = useState<number | null>(
		null,
	);
	const [answerFileIndex, setAnswerFileIndex] = useState<number | null>(null);

	// 処理状態
	const [isProcessing, setIsProcessing] = useState(false);
	const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
		step: "upload",
		progress: 0,
		message: "PDFファイルを選択してください",
	});

	const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
	const [processingResult, setProcessingResult] = useState<ProcessingResult>(
		{},
	);

	// ファイル数に基づく処理モードの自動判定
	const currentMode: ProcessingMode = useMemo(() => {
		return files.length === 2 ? "dual" : "single";
	}, [files.length]);

	// ファイル選択時のリセット処理
	const resetProcessingState = useCallback(() => {
		setGeneratedCards([]);
		setProcessingResult({});
		setProcessingStatus({
			step: "upload",
			progress: 0,
			message: "PDFファイルを選択してください",
		});
	}, []);

	// ファイル変更ハンドラー
	const onFilesChange = useCallback(
		(newFiles: File[]) => {
			setFiles(newFiles);

			// ファイル数が変わったときの処理
			if (newFiles.length !== files.length) {
				resetProcessingState();

				// ファイル種別インデックスをリセット
				if (newFiles.length < 2) {
					setQuestionFileIndex(null);
					setAnswerFileIndex(null);
				} else if (newFiles.length === 2) {
					// 2ファイルの場合、インデックスが無効なものをリセット
					if (
						questionFileIndex !== null &&
						questionFileIndex >= newFiles.length
					) {
						setQuestionFileIndex(null);
					}
					if (answerFileIndex !== null && answerFileIndex >= newFiles.length) {
						setAnswerFileIndex(null);
					}
				}
			}

			// ステータスメッセージ更新
			if (newFiles.length > 0) {
				const mode = newFiles.length === 2 ? "デュアル" : "シングル";
				setProcessingStatus({
					step: "upload",
					progress: 0,
					message: `${mode}モード: ${newFiles.length}個のファイルが選択されました`,
				});
			}
		},
		[files.length, questionFileIndex, answerFileIndex, resetProcessingState],
	);

	// ファイル削除ハンドラー
	const onFileRemove = useCallback(
		(index: number) => {
			const newFiles = files.filter((_, i) => i !== index);

			// インデックスを調整
			let newQuestionIndex = questionFileIndex;
			let newAnswerIndex = answerFileIndex;

			if (questionFileIndex === index) {
				newQuestionIndex = null;
			} else if (questionFileIndex !== null && questionFileIndex > index) {
				newQuestionIndex = questionFileIndex - 1;
			}

			if (answerFileIndex === index) {
				newAnswerIndex = null;
			} else if (answerFileIndex !== null && answerFileIndex > index) {
				newAnswerIndex = answerFileIndex - 1;
			}

			setFiles(newFiles);
			setQuestionFileIndex(newQuestionIndex);
			setAnswerFileIndex(newAnswerIndex);
			resetProcessingState();
		},
		[files, questionFileIndex, answerFileIndex, resetProcessingState],
	);

	// ファイル種別選択ハンドラー
	const onQuestionFileSelect = useCallback((index: number) => {
		setQuestionFileIndex(index >= 0 ? index : null);
	}, []);

	const onAnswerFileSelect = useCallback((index: number) => {
		setAnswerFileIndex(index >= 0 ? index : null);
	}, []);

	// シングルPDF処理
	const processSinglePdf = useCallback(
		async (file: File) => {
			try {
				// プログレス更新: テキスト抽出開始（クライアントサイド）
				setProcessingStatus({
					step: "extract",
					progress: 10,
					message: "PDFを解析中（全ページ対応）...",
				});

				// 1. クライアントサイドでPDFテキスト抽出（未実装のため仮実装）
				const extractResult = {
					success: false,
					message: "PDF text extraction is not implemented yet",
					extractedText: null,
					usedOCR: false,
					totalPages: 0,
				};

				if (!extractResult.success || !extractResult.extractedText) {
					throw new Error(
						extractResult.message || "テキスト抽出に失敗しました",
					);
				}

				// プログレス更新: サーバー処理開始（OCR使用状況に応じてメッセージ変更）
				const processingMessage = extractResult.usedOCR
					? "OCR処理完了。問題と解答を分析中..."
					: "問題と解答を分析中...";

				setProcessingStatus({
					step: "process",
					progress: 50,
					message: processingMessage,
				});

				await new Promise((resolve) => setTimeout(resolve, 300)); // UI更新のための短い待機

				// 2. サーバーサイドでテキスト処理→カード生成
				const result = await processExtractedText(
					extractResult.extractedText,
					userId,
				);

				if (!result.success || !result.cards) {
					throw new Error(result.message || "カード生成に失敗しました");
				}

				// プログレス更新: 完了（OCR使用状況を表示）
				const completionMessage = extractResult.usedOCR
					? `OCR処理で${result.cards.length}個のカードを生成しました`
					: `${result.cards.length}個のカードを生成しました`;

				setProcessingStatus({
					step: "complete",
					progress: 100,
					message: completionMessage,
				});

				setGeneratedCards(result.cards);
				setProcessingResult({
					totalPages: extractResult.totalPages || 0,
					processingTimeMs: result.processingTimeMs,
				});

				const toastDescription = extractResult.usedOCR
					? `OCR処理により${result.cards.length}件のカード候補が生成されました。`
					: `${result.cards.length}件のカード候補が生成されました。`;

				toast.success("カードの生成が完了しました", {
					description: toastDescription,
				});
			} catch (error) {
				console.error("シングルPDF処理エラー:", error);
				throw error;
			}
		},
		[userId],
	);

	// デュアルPDF処理
	const processDualPdf = useCallback(
		async (questionFile: File, answerFile: File) => {
			try {
				setProcessingStatus({
					step: "extract",
					progress: 10,
					message: "問題PDFと解答PDFから画像を抽出中...",
				});

				// 1. 問題PDFと解答PDFから画像を抽出（未実装のため仮実装）
				const questionPages: Array<{ pageNumber: number; imageBlob: Blob }> =
					[];
				const answerPages: Array<{ pageNumber: number; imageBlob: Blob }> = [];
				// const [questionPages, answerPages] = await Promise.all([
				// 	extractPdfPagesAsImages(questionFile),
				// 	extractPdfPagesAsImages(answerFile),
				// ]);

				setProcessingStatus({
					step: "process",
					progress: 40,
					message: "デュアルPDF OCR処理中（高品質解説付き）...",
				});

				// 2. サイズチェックしてからOCR処理を選択
				const questionSize = questionPages.reduce(
					(sum: number, page: { pageNumber: number; imageBlob: Blob }) =>
						sum + page.imageBlob.size,
					0,
				);
				const answerSize = answerPages.reduce(
					(sum: number, page: { pageNumber: number; imageBlob: Blob }) =>
						sum + page.imageBlob.size,
					0,
				);
				const totalSizeMB = (questionSize + answerSize) / (1024 * 1024);

				console.log(`[デュアルPDF] 総画像サイズ: ${totalSizeMB.toFixed(2)}MB`);

				let ocrResult: {
					success: boolean;
					message: string;
					extractedText?: Array<{
						pageNumber: number;
						questionText: string;
						answerText: string;
						explanationText?: string;
					}>;
					processingTimeMs?: number;
				};

				if (totalSizeMB > 20) {
					// 超大容量: 1ページずつ順次処理
					setProcessingStatus({
						step: "process",
						progress: 50,
						message: `超大容量ファイル処理中（${totalSizeMB.toFixed(1)}MB、1ページずつ）...`,
					});

					// フォールバック処理: 順次OCR
					const { processSinglePageOcr } = await import(
						"@/app/_actions/pdfOcr"
					);
					const questionTexts: Array<{ pageNumber: number; text: string }> = [];
					const answerTexts: Array<{ pageNumber: number; text: string }> = [];

					// 問題PDFを順次処理
					let processedCount = 0;
					const totalSinglePages = questionPages.length + answerPages.length;

					for (const page of questionPages) {
						setProcessingStatus({
							step: "process",
							progress:
								Math.round((processedCount / totalSinglePages) * 40) + 50,
							message: `問題ページ${page.pageNumber}/${questionPages.length}を処理中...`,
						});

						try {
							const result = await processSinglePageOcr(userId, page);
							if (result.success && result.text) {
								questionTexts.push({
									pageNumber: page.pageNumber,
									text: result.text,
								});
							}
						} catch (error) {
							console.error(
								`問題ページ${page.pageNumber}のOCR処理エラー:`,
								error,
							);
						}
						processedCount++;
					}

					// 解答PDFを順次処理
					for (const page of answerPages) {
						setProcessingStatus({
							step: "process",
							progress:
								Math.round((processedCount / totalSinglePages) * 40) + 50,
							message: `解答ページ${page.pageNumber}/${answerPages.length}を処理中...`,
						});

						try {
							const result = await processSinglePageOcr(userId, page);
							if (result.success && result.text) {
								answerTexts.push({
									pageNumber: page.pageNumber,
									text: result.text,
								});
							}
						} catch (error) {
							console.error(
								`解答ページ${page.pageNumber}のOCR処理エラー:`,
								error,
							);
						}
						processedCount++;
					}

					// 疑似的なデュアルOCR結果を作成
					const extractedText = questionTexts.map((qText, index) => {
						const correspondingAnswer = answerTexts.find(
							(a) => a.pageNumber === qText.pageNumber,
						) ||
							answerTexts[index] || { text: "解答が見つかりませんでした" };

						return {
							pageNumber: qText.pageNumber,
							questionText: qText.text,
							answerText: correspondingAnswer.text,
							explanationText:
								"順次処理のため詳細解説は生成されませんでした。解答テキストをご確認ください。",
						};
					});

					ocrResult = {
						success: extractedText.length > 0,
						message: `順次処理で${extractedText.length}個の問題・解答セットを抽出しました`,
						extractedText,
						processingTimeMs: 0,
					};
				} else if (totalSizeMB > 10) {
					// 大容量: 超小分割バッチ処理（2ページずつ）
					setProcessingStatus({
						step: "process",
						progress: 50,
						message: `大容量ファイル処理中（${totalSizeMB.toFixed(1)}MB、2ページずつ）...`,
					});

					ocrResult = await processLargeDualPdfInBatches(
						questionPages,
						answerPages,
						2,
					);
				} else if (totalSizeMB > 3) {
					// 中容量: 分割バッチ処理（3ページずつ）
					setProcessingStatus({
						step: "process",
						progress: 50,
						message: `分割バッチ処理中（${totalSizeMB.toFixed(1)}MB、3ページずつ）...`,
					});

					ocrResult = await processLargeDualPdfInBatches(
						questionPages,
						answerPages,
						3,
					);
				} else {
					// 小容量: 高速バッチ処理（全ページ一括）
					setProcessingStatus({
						step: "process",
						progress: 60,
						message: `高速処理中（${totalSizeMB.toFixed(1)}MB、全${questionPages.length + answerPages.length}ページを一括処理）...`,
					});

					ocrResult = await processDualPdfBatchOcr(questionPages, answerPages);
				}

				if (!ocrResult.success || !ocrResult.extractedText) {
					throw new Error(
						ocrResult.message || "デュアルPDF OCR処理に失敗しました",
					);
				}

				setProcessingStatus({
					step: "process",
					progress: 70,
					message: "高品質カードを生成中...",
				});

				// 3. カード生成
				const cards = await generateCardsFromDualPdfData(
					ocrResult.extractedText,
					URL.createObjectURL(questionFile),
				);

				setGeneratedCards(cards);

				setProcessingResult({
					totalPages: questionPages.length + answerPages.length,
					processingTimeMs: ocrResult.processingTimeMs,
				});

				setProcessingStatus({
					step: "complete",
					progress: 100,
					message: `${cards.length}個の高品質カード（解説付き）を生成しました！`,
				});

				toast.success(
					`デュアルPDF処理完了！${cards.length}個の詳細解説付きカードを生成しました。`,
				);
			} catch (error) {
				console.error("デュアルPDF処理エラー:", error);
				throw error;
			}
		},
		[userId],
	);

	// 統一処理関数
	const processFiles = useCallback(async () => {
		if (!isClient) {
			toast.error("クライアント環境の準備中です。しばらくお待ちください。");
			return;
		}

		if (files.length === 0) {
			toast.error("PDFファイルが選択されていません");
			return;
		}

		setIsProcessing(true);

		try {
			if (currentMode === "single") {
				// シングルモード処理
				await processSinglePdf(files[0]);
			} else if (currentMode === "dual") {
				// デュアルモード処理
				if (files.length !== 2) {
					throw new Error("デュアルモードには2つのPDFファイルが必要です");
				}

				// ファイル種別の決定
				let questionFile: File;
				let answerFile: File;

				if (questionFileIndex !== null && answerFileIndex !== null) {
					// 両方指定されている場合
					questionFile = files[questionFileIndex];
					answerFile = files[answerFileIndex];
				} else if (questionFileIndex !== null) {
					// 問題ファイルのみ指定されている場合
					questionFile = files[questionFileIndex];
					answerFile = files[questionFileIndex === 0 ? 1 : 0];
				} else if (answerFileIndex !== null) {
					// 解答ファイルのみ指定されている場合
					answerFile = files[answerFileIndex];
					questionFile = files[answerFileIndex === 0 ? 1 : 0];
				} else {
					// 両方指定されていない場合は順番で決定
					questionFile = files[0];
					answerFile = files[1];
				}

				await processDualPdf(questionFile, answerFile);
			}
		} catch (error) {
			console.error("PDF処理エラー:", error);
			toast.error("エラーが発生しました", {
				description:
					error instanceof Error
						? error.message
						: "PDF処理中にエラーが発生しました。",
			});
			setProcessingStatus({
				step: "upload",
				progress: 0,
				message: "エラーが発生しました。もう一度お試しください。",
			});
		} finally {
			setIsProcessing(false);
		}
	}, [
		isClient,
		files,
		currentMode,
		questionFileIndex,
		answerFileIndex,
		processSinglePdf,
		processDualPdf,
	]);

	return {
		// ファイル管理
		files,
		onFilesChange,
		onFileRemove,

		// ファイル種別指定
		questionFileIndex,
		answerFileIndex,
		onQuestionFileSelect,
		onAnswerFileSelect,

		// 処理実行
		processFiles,

		// 現在のモード
		currentMode,

		// 共通状態
		isProcessing,
		processingStatus,
		generatedCards,
		processingResult,
		isClient,
	};
}
