import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useImageOcr } from "@/hooks/use-image-ocr";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { Copy, FileText, Loader2 } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback } from "react";

/**
 * A NodeView component that displays the Gyazo image normally,
 * but shows the wrapped URL when the node is selected (caret on the node).
 * Enhanced with OCR context menu functionality.
 */
export const GyazoImageNodeView: React.FC<NodeViewProps> = ({
	node,
	selected,
	editor,
}) => {
	const src = node.attrs.src as string;
	const fullWidth = node.attrs.fullWidth as boolean;
	// Convert back to gyazo.com URL without .png
	const pageUrl = src
		.replace(/^https:\/\/i\.gyazo\.com\//, "https://gyazo.com/")
		.replace(/\.png$/, "");
	// Use raw endpoint for Gyazo images
	const rawUrl = `${pageUrl}/raw`;

	// OCR処理のハンドリング
	const { processImage, isProcessing, progress, currentStage } = useImageOcr({
		enableProgress: true,
		showToasts: true,
		onComplete: (result) => {
			if (result.success && result.text.length > 0 && editor) {
				// OCR結果をエディタに挿入
				insertOcrTextToEditor(result.text);
			}
		},
	});

	// エディタにテキストを挿入する関数
	const insertOcrTextToEditor = useCallback(
		(text: string) => {
			if (!editor) return;

			// 現在のノードの位置を取得
			const pos = editor.view.posAtDOM(
				editor.view.dom.querySelector("[data-node-view-content]") ||
					editor.view.dom,
				0,
			);

			// ノードの後ろに段落とテキストを挿入
			editor
				.chain()
				.focus()
				.insertContentAt(pos + 1, [
					{
						type: "paragraph",
						content: [],
					},
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: `📝 OCR抽出テキスト:\n${text}`,
							},
						],
					},
				])
				.run();
		},
		[editor],
	);

	// OCR処理を開始
	const handleStartOcr = useCallback(async () => {
		if (isProcessing) return;
		await processImage(rawUrl);
	}, [processImage, rawUrl, isProcessing]);

	// 画像URLをクリップボードにコピー
	const handleCopyImageUrl = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(rawUrl);
			// トースト通知は useImageOcr 内で管理されているため、ここでは追加しない
		} catch (err) {
			console.error("Failed to copy image URL:", err);
		}
	}, [rawUrl]);

	return (
		<NodeViewWrapper
			as="span"
			contentEditable={selected}
			suppressContentEditableWarning
		>
			{selected ? (
				<span contentEditable suppressContentEditableWarning>
					{fullWidth ? `[[${pageUrl}]]` : `[${pageUrl}]`}
				</span>
			) : (
				<ContextMenu>
					<ContextMenuTrigger asChild>
						<div className="relative inline-block">
							<Dialog>
								<DialogTrigger asChild>
									<div
										onMouseDown={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
										className={`relative inline-block cursor-pointer h-[300px] ${fullWidth ? "w-full" : "w-auto"}`}
										contentEditable={false}
									>
										<Image
											src={rawUrl}
											alt={`Gyazo image: ${pageUrl}`}
											width={300}
											height={300}
											style={{
												width: "auto",
												height: 300,
												borderRadius: 8,
												objectFit: fullWidth ? "cover" : "contain",
												transition: "box-shadow 0.3s ease",
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.boxShadow =
													"0 0 1rem 0 rgba(0, 0, 0, 0.3)";
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.boxShadow = "none";
											}}
										/>

										{/* OCR処理中のオーバーレイ */}
										{isProcessing && (
											<div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
												<div className="bg-white rounded-lg p-4 shadow-lg max-w-[80%]">
													<div className="flex items-center gap-3">
														<Loader2 className="h-5 w-5 animate-spin text-blue-600" />
														<div className="text-sm">
															<div className="font-medium">OCR処理中...</div>
															<div className="text-gray-600">
																{currentStage}
															</div>
															<div className="text-xs text-gray-500 mt-1">
																{Math.round(progress)}% 完了
															</div>
														</div>
													</div>
												</div>
											</div>
										)}
									</div>
								</DialogTrigger>
								<DialogContent className="md:!max-w-[90vw]">
									<DialogTitle className="sr-only">Gyazo Image</DialogTitle>
									<div className="relative w-full h-[90vh]">
										<Image
											src={rawUrl}
											alt={`Gyazo (enlarged): ${pageUrl}`}
											fill
											style={{ objectFit: "contain" }}
										/>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					</ContextMenuTrigger>

					<ContextMenuContent className="w-56">
						<ContextMenuItem
							onClick={handleStartOcr}
							disabled={isProcessing}
							className="cursor-pointer"
						>
							{isProcessing ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									処理中... ({Math.round(progress)}%)
								</>
							) : (
								<>
									<FileText className="mr-2 h-4 w-4" />
									この画像を文字起こしする
								</>
							)}
						</ContextMenuItem>

						<ContextMenuSeparator />

						<ContextMenuItem
							onClick={handleCopyImageUrl}
							className="cursor-pointer"
						>
							<Copy className="mr-2 h-4 w-4" />
							画像URLをコピー
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>
			)}
		</NodeViewWrapper>
	);
};
