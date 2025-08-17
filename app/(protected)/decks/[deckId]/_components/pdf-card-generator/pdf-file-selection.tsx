"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	FileText,
	Upload,
	X,
	FileCheck2,
	Files,
	AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { validatePdfFile } from "@/lib/utils/pdfValidation";
import type { FileSelectionProps } from "@/types/pdf-card-generator";

export function PdfFileSelection({
	files,
	onFilesChange,
	onFileRemove,
	questionFileIndex,
	answerFileIndex,
	onQuestionFileSelect,
	onAnswerFileSelect,
	currentMode,
	isProcessing,
}: FileSelectionProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);

	// ファイル追加処理
	const addFiles = useCallback(
		(newFiles: FileList | File[]) => {
			const fileArray = Array.from(newFiles);
			const validFiles: File[] = [];

			for (const file of fileArray) {
				const validation = validatePdfFile(file);
				if (!validation.valid) {
					toast.error(`${file.name}: ${validation.error}`);
					continue;
				}
				validFiles.push(file);
			}

			if (validFiles.length > 0) {
				const updatedFiles = [...files, ...validFiles];

				// 最大2ファイルまでに制限
				if (updatedFiles.length > 2) {
					toast.warning("最大2つのPDFファイルまで選択できます。");
					onFilesChange(updatedFiles.slice(0, 2));
				} else {
					onFilesChange(updatedFiles);
				}
			}
		},
		[files, onFilesChange],
	);

	// ファイル選択ハンドラー
	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selectedFiles = e.target.files;
			if (selectedFiles && selectedFiles.length > 0) {
				addFiles(selectedFiles);
			}
			// inputをクリア
			e.target.value = "";
		},
		[addFiles],
	);

	// ドラッグ&ドロップハンドラー
	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);

			const droppedFiles = e.dataTransfer.files;
			if (droppedFiles.length > 0) {
				addFiles(droppedFiles);
			}
		},
		[addFiles],
	);

	// ファイル選択ボタンクリック
	const selectFiles = () => fileInputRef.current?.click();

	// モード表示テキスト
	const getModeText = () => {
		switch (currentMode) {
			case "single":
				return "シングルPDF処理（1ファイル）";
			case "dual":
				return "デュアルPDF処理（2ファイル - 高品質解説付き）";
			default:
				return "処理モード";
		}
	};

	// ファイル種別設定
	const setFileAsQuestion = (index: number) => {
		if (answerFileIndex === index) {
			// 解答ファイルに設定されていたら解除
			onAnswerFileSelect(-1);
		}
		onQuestionFileSelect(index);
	};

	const setFileAsAnswer = (index: number) => {
		if (questionFileIndex === index) {
			// 問題ファイルに設定されていたら解除
			onQuestionFileSelect(-1);
		}
		onAnswerFileSelect(index);
	};

	return (
		<div className="space-y-4">
			{/* 現在のモード表示 */}
			<div className="flex items-center gap-2">
				<Badge variant="outline" className="flex items-center gap-1">
					{currentMode === "single" ? (
						<FileCheck2 className="h-3 w-3" />
					) : (
						<Files className="h-3 w-3" />
					)}
					{getModeText()}
				</Badge>
				{files.length === 0 && (
					<span className="text-sm text-muted-foreground">
						ファイル数により自動的にモードが決まります
					</span>
				)}
			</div>

			{/* ドラッグ&ドロップエリア */}
			<Card
				className={`transition-all duration-200 ${
					isDragOver
						? "border-2 border-dashed border-primary bg-primary/5"
						: "border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
				} ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
			>
				<CardContent
					className="p-8 text-center"
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<div className="space-y-4 flex flex-col items-center justify-center">
						<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
							<Upload className="h-6 w-6 text-muted-foreground" />
						</div>

						<div className="space-y-2">
							<p className="text-lg font-medium">
								PDFファイルをドラッグ&ドロップ
							</p>
							<p className="text-sm text-muted-foreground">
								または下のボタンからファイルを選択してください
							</p>
							<p className="text-xs text-muted-foreground">
								1ファイル: シングル処理 / 2ファイル: デュアル処理（高品質）
							</p>
						</div>

						<Button
							variant="outline"
							onClick={selectFiles}
							disabled={isProcessing}
							className="flex items-center gap-2"
						>
							<FileText className="h-4 w-4" />
							ファイルを選択
						</Button>
					</div>

					<input
						ref={fileInputRef}
						type="file"
						accept=".pdf"
						multiple
						onChange={handleFileSelect}
						className="hidden"
					/>
				</CardContent>
			</Card>

			{/* 選択されたファイル一覧 */}
			{files.length > 0 && (
				<div className="space-y-3">
					<Label className="text-base font-medium">
						選択されたファイル ({files.length}/2)
					</Label>

					<div className="space-y-2">
						{files.map((file, index) => (
							<Card key={`${file.name}-${index}`} className="p-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3 flex-1 min-w-0">
										<FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{file.name}
											</p>
											<p className="text-xs text-muted-foreground">
												{(file.size / (1024 * 1024)).toFixed(1)}MB
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2">
										{/* デュアルモード時のファイル種別選択 */}
										{currentMode === "dual" && (
											<div className="flex gap-1">
												<Button
													size="sm"
													variant={
														questionFileIndex === index ? "default" : "outline"
													}
													onClick={() => setFileAsQuestion(index)}
													disabled={isProcessing}
													className="text-xs h-6 px-2"
												>
													問題
												</Button>
												<Button
													size="sm"
													variant={
														answerFileIndex === index ? "default" : "outline"
													}
													onClick={() => setFileAsAnswer(index)}
													disabled={isProcessing}
													className="text-xs h-6 px-2"
												>
													解答
												</Button>
											</div>
										)}

										{/* ファイル削除ボタン */}
										<Button
											size="sm"
											variant="ghost"
											onClick={() => onFileRemove(index)}
											disabled={isProcessing}
											className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
										>
											<X className="h-3 w-3" />
										</Button>
									</div>
								</div>
							</Card>
						))}
					</div>

					{/* デュアルモード時の注意事項 */}
					{currentMode === "dual" && (
						<div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
							<AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-blue-800 dark:text-blue-200">
								<p className="font-medium">デュアルPDF処理について</p>
								<p className="text-xs mt-1">
									問題PDFと解答PDFを指定すると、より詳細で高品質な解説付きカードが生成されます。
									ファイル種別が指定されていない場合は、自動的に判定されます。
								</p>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
