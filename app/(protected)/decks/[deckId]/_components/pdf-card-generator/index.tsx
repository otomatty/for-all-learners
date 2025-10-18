"use client";

import { FileText, Loader2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePdfProcessing } from "@/hooks/use-pdf-processing";
import type {
	CardSelectionState,
	PdfCardGeneratorProps,
} from "@/types/pdf-card-generator";
import { PdfFileSelection } from "./pdf-file-selection";
import { PdfGeneratedCardList } from "./pdf-generated-card-list";
import { PdfProcessingStatus } from "./pdf-processing-status";

export function PdfCardGenerator({ deckId, userId }: PdfCardGeneratorProps) {
	// PDF処理フック
	const {
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
	} = usePdfProcessing(userId);

	// UI状態
	const [selectedCards, setSelectedCards] = useState<CardSelectionState>({});

	// カード生成時に初期選択状態を設定
	useEffect(() => {
		if (generatedCards.length > 0) {
			const initialSelection: CardSelectionState = {};
			generatedCards.forEach((_, index) => {
				initialSelection[index.toString()] = true;
			});
			setSelectedCards(initialSelection);
		}
	}, [generatedCards]);

	// カード選択の管理
	const handleCardSelection = (index: string, checked: boolean) => {
		setSelectedCards((prev) => ({
			...prev,
			[index]: checked,
		}));
	};

	const selectAllCards = () => {
		const allSelected: CardSelectionState = {};
		generatedCards.forEach((_, index) => {
			allSelected[index.toString()] = true;
		});
		setSelectedCards(allSelected);
	};

	const deselectAllCards = () => {
		setSelectedCards({});
	};

	// 処理開始可能かどうかの判定
	const canStartProcessing = () => {
		if (files.length === 0 || isProcessing || !isClient) {
			return false;
		}

		// シングルモード: 1ファイルあれば処理可能
		if (currentMode === "single" && files.length === 1) {
			return true;
		}

		// デュアルモード: 2ファイルあれば処理可能
		if (currentMode === "dual" && files.length === 2) {
			return true;
		}

		return false;
	};

	// 処理開始ボタンのテキスト
	const getStartButtonText = () => {
		if (!isClient) {
			return "準備中...";
		}

		if (currentMode === "single") {
			return "シングルPDF処理を開始";
		}
		if (currentMode === "dual") {
			return "デュアルPDF処理を開始（高品質解説付き）";
		}

		return "処理を開始";
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						PDF過去問からカード生成
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* ファイル選択コンポーネント */}
					<PdfFileSelection
						files={files}
						onFilesChange={onFilesChange}
						onFileRemove={onFileRemove}
						questionFileIndex={questionFileIndex}
						answerFileIndex={answerFileIndex}
						onQuestionFileSelect={onQuestionFileSelect}
						onAnswerFileSelect={onAnswerFileSelect}
						currentMode={currentMode}
						isProcessing={isProcessing}
					/>

					{/* 処理状況表示 */}
					<PdfProcessingStatus
						status={processingStatus}
						processingResult={processingResult}
						isVisible={files.length > 0 || isProcessing}
					/>

					{/* 処理開始ボタン */}
					{!isProcessing &&
						generatedCards.length === 0 &&
						canStartProcessing() && (
							<Button
								onClick={processFiles}
								className="w-full"
								size="lg"
								disabled={!canStartProcessing()}
							>
								<Play className="h-4 w-4 mr-2" />
								{getStartButtonText()}
							</Button>
						)}

					{/* 処理中ローディング */}
					{isProcessing && (
						<div className="flex items-center justify-center py-8">
							<div className="text-center space-y-2">
								<Loader2 className="h-8 w-8 animate-spin mx-auto" />
								<p className="text-sm text-muted-foreground">
									PDF処理中です。しばらくお待ちください...
								</p>
								<p className="text-xs text-muted-foreground">
									{currentMode === "dual"
										? "高品質解説付きカードを生成中"
										: "標準カードを生成中"}
								</p>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* 生成されたカードリスト */}
			<PdfGeneratedCardList
				cards={generatedCards}
				selectedCards={selectedCards}
				onCardSelection={handleCardSelection}
				onSelectAll={selectAllCards}
				onDeselectAll={deselectAllCards}
				deckId={deckId}
				userId={userId}
			/>
		</div>
	);
}
