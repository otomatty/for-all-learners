"use client";

import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import {
	Bold,
	Code,
	Hash,
	Heading1,
	Heading2,
	Heading3,
	Link2,
	Link2Off,
	List,
	ListOrdered,
	Scissors,
	Strikethrough,
} from "lucide-react";
import { useEffect, useState } from "react";

interface EditPageBubbleMenuProps {
	editor: Editor | null;
	wrapSelectionWithPageLink: () => void;
	splitPage: () => void;
}

/**
 * テキスト選択時に表示されるバブルメニューコンポーネント
 *
 * モバイルとデスクトップで異なるUIを提供：
 * - デスクトップ: 全機能のツールバー（見出し、太字、取り消し線、リスト、リンク、分割、コードブロック）
 * - モバイル: 最重要機能のみ（リンク、太字、コードブロック）+ 遅延表示でOS標準メニューとの競合を回避
 *
 * @param editor - Tiptapエディターインスタンス
 * @param wrapSelectionWithPageLink - 選択テキストをページリンクで囲む/解除する関数
 * @param splitPage - 選択部分を新しいページに分割する関数
 */
export function EditPageBubbleMenu({
	editor,
	wrapSelectionWithPageLink,
	splitPage,
}: EditPageBubbleMenuProps) {
	if (!editor) return null;

	const [isMac, setIsMac] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [isLinkSelected, setIsLinkSelected] = useState(false);

	useEffect(() => {
		setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
		setIsMobile(/Android|Mobi/i.test(navigator.userAgent));
	}, []);

	// Check if the current selection is a link (wrapped in brackets)
	useEffect(() => {
		if (!editor) return;

		const checkLinkSelection = () => {
			const { from, to } = editor.state.selection;
			if (from >= to) {
				setIsLinkSelected(false);
				return;
			}

			const selectedText = editor.state.doc.textBetween(from, to, "");
			const isWrappedInBrackets = /^\[(.+)\]$/.test(selectedText);
			setIsLinkSelected(isWrappedInBrackets);
		};

		editor.on("selectionUpdate", checkLinkSelection);
		checkLinkSelection(); // Initial check

		return () => {
			editor.off("selectionUpdate", checkLinkSelection);
		};
	}, [editor]);

	return (
		<TooltipProvider>
			<BubbleMenu
				editor={editor}
				shouldShow={({ state }) => {
					const { from, to } = state.selection;
					return from < to;
				}}
				tippyOptions={{
					duration: 100,
					// モバイルでの表示設定を調整
					delay: isMobile ? [800, 0] : [0, 0], // モバイルでは800ms遅延
					placement: isMobile ? "bottom" : "top", // モバイルでは下に表示
					offset: isMobile ? [0, 10] : [0, 8], // モバイルでより離す
					hideOnClick: false, // クリック時に非表示にしない
					interactive: true, // インタラクティブにする
				}}
			>
				<div
					className={`flex space-x-1 bg-background text-foreground shadow-md rounded p-1 ${
						isMobile ? "px-3 py-2" : ""
					}`}
				>
					{/* モバイルでは最重要な機能のみ表示 */}
					{isMobile ? (
						<>
							{/* Link/Unlink Toggle - モバイル最重要機能 */}
							<button
								type="button"
								onClick={wrapSelectionWithPageLink}
								className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
							>
								{isLinkSelected ? (
									<Link2Off className="w-6 h-6" />
								) : (
									<Link2 className="w-6 h-6" />
								)}
							</button>

							{/* Bold - モバイル重要機能 */}
							<button
								type="button"
								onClick={() => editor.chain().focus().toggleBold().run()}
								className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
							>
								<Bold className="w-6 h-6" />
							</button>

							{/* Code Block - 開発者用 */}
							<button
								type="button"
								onClick={() => editor.chain().focus().toggleCodeBlock().run()}
								className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
							>
								<Code className="w-6 h-6" />
							</button>
						</>
					) : (
						<>
							{/* デスクトップ版の従来のUI */}
							{/* Headings Dropdown */}
							<DropdownMenu>
								{!isMobile ? (
									<Tooltip>
										<TooltipTrigger asChild>
											<DropdownMenuTrigger asChild>
												<button
													type="button"
													className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
												>
													<Hash className="w-5 h-5" />
												</button>
											</DropdownMenuTrigger>
										</TooltipTrigger>
										<TooltipContent side="top">
											{isMac ? (
												<div className="flex items-center space-x-1">
													<span>見出し:</span>
													<Badge variant="secondary">⌘+Option+1</Badge>
													<Badge variant="secondary">⌘+Option+2</Badge>
													<Badge variant="secondary">⌘+Option+3</Badge>
												</div>
											) : (
												<div className="flex items-center space-x-1">
													<span>見出し:</span>
													<Badge variant="secondary">Ctrl+Alt+1</Badge>
													<Badge variant="secondary">Ctrl+Alt+2</Badge>
													<Badge variant="secondary">Ctrl+Alt+3</Badge>
												</div>
											)}
										</TooltipContent>
									</Tooltip>
								) : (
									<DropdownMenuTrigger asChild>
										<button
											type="button"
											className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
										>
											<Hash className="w-5 h-5" />
										</button>
									</DropdownMenuTrigger>
								)}
								<DropdownMenuContent>
									<DropdownMenuItem
										onSelect={() =>
											editor.chain().focus().toggleHeading({ level: 1 }).run()
										}
									>
										<Heading1 className="w-4 h-4 mr-2" /> 見出し1
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() =>
											editor.chain().focus().toggleHeading({ level: 2 }).run()
										}
									>
										<Heading2 className="w-4 h-4 mr-2" /> 見出し2
									</DropdownMenuItem>
									<DropdownMenuItem
										onSelect={() =>
											editor.chain().focus().toggleHeading({ level: 3 }).run()
										}
									>
										<Heading3 className="w-4 h-4 mr-2" /> 見出し3
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Bold */}
							{!isMobile ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={() => editor.chain().focus().toggleBold().run()}
											className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
										>
											<Bold className="w-5 h-5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<div className="flex items-center space-x-1">
											<span>太字:</span>
											<Badge variant="secondary">
												{isMac ? "⌘+B" : "Ctrl+B"}
											</Badge>
										</div>
									</TooltipContent>
								</Tooltip>
							) : (
								<button
									type="button"
									onClick={() => editor.chain().focus().toggleBold().run()}
									className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									<Bold className="w-5 h-5" />
								</button>
							)}

							{/* Strikethrough */}
							{!isMobile ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={() =>
												editor.chain().focus().toggleStrike().run()
											}
											className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
										>
											<Strikethrough className="w-5 h-5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<div className="flex items-center space-x-1">
											<span>打ち消し線:</span>
											<Badge variant="secondary">
												{isMac ? "⌘+Shift+X" : "Ctrl+Shift+X"}
											</Badge>
										</div>
									</TooltipContent>
								</Tooltip>
							) : (
								<button
									type="button"
									onClick={() => editor.chain().focus().toggleStrike().run()}
									className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									<Strikethrough className="w-5 h-5" />
								</button>
							)}

							{/* Ordered List */}
							{!isMobile ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={() =>
												editor.chain().focus().toggleOrderedList().run()
											}
											className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
										>
											<ListOrdered className="w-5 h-5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<div className="flex items-center space-x-1">
											<span>順序付きリスト:</span>
											<Badge variant="secondary">
												{isMac ? "⌘+Shift+O" : "Ctrl+Shift+O"}
											</Badge>
										</div>
									</TooltipContent>
								</Tooltip>
							) : (
								<button
									type="button"
									onClick={() =>
										editor.chain().focus().toggleOrderedList().run()
									}
									className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									<ListOrdered className="w-5 h-5" />
								</button>
							)}

							{/* Unordered List */}
							{!isMobile ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={() =>
												editor.chain().focus().toggleBulletList().run()
											}
											className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
										>
											<List className="w-5 h-5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<div className="flex items-center space-x-1">
											<span>箇条書き:</span>
											<Badge variant="secondary">
												{isMac ? "⌘+Shift+L" : "Ctrl+Shift+L"}
											</Badge>
										</div>
									</TooltipContent>
								</Tooltip>
							) : (
								<button
									type="button"
									onClick={() =>
										editor.chain().focus().toggleBulletList().run()
									}
									className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									<List className="w-5 h-5" />
								</button>
							)}

							{/* Link/Unlink Toggle */}
							{!isMobile ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={wrapSelectionWithPageLink}
											className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
										>
											{isLinkSelected ? (
												<Link2Off className="w-5 h-5" />
											) : (
												<Link2 className="w-5 h-5" />
											)}
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<div className="flex items-center space-x-1">
											<span>{isLinkSelected ? "リンク解除:" : "リンク:"}</span>
											<Badge variant="secondary">
												{isMac ? "⌘+K" : "Ctrl+K"}
											</Badge>
										</div>
									</TooltipContent>
								</Tooltip>
							) : (
								<button
									type="button"
									onClick={wrapSelectionWithPageLink}
									className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									{isLinkSelected ? (
										<Link2Off className="w-5 h-5" />
									) : (
										<Link2 className="w-5 h-5" />
									)}
								</button>
							)}

							{/* Page Split */}
							{!isMobile ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={splitPage}
											className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
										>
											<Scissors className="w-5 h-5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<div className="flex items-center space-x-1">
											<span>ページ分割</span>
											<Badge variant="secondary">
												{isMac ? "⌘+Shift+P" : "Ctrl+Shift+P"}
											</Badge>
										</div>
									</TooltipContent>
								</Tooltip>
							) : (
								<button
									type="button"
									onClick={splitPage}
									className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									<Scissors className="w-5 h-5" />
								</button>
							)}

							{/* Code Block */}
							{!isMobile ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={() =>
												editor.chain().focus().toggleCodeBlock().run()
											}
											className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
										>
											<Code className="w-5 h-5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="top">
										<div className="flex items-center space-x-1">
											<span>コードブロック:</span>
											<Badge variant="secondary">
												{isMac ? "⌘+Shift+C" : "Ctrl+Shift+C"}
											</Badge>
										</div>
									</TooltipContent>
								</Tooltip>
							) : (
								<button
									type="button"
									onClick={() => editor.chain().focus().toggleCodeBlock().run()}
									className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
								>
									<Code className="w-5 h-5" />
								</button>
							)}
						</>
					)}
				</div>
			</BubbleMenu>
		</TooltipProvider>
	);
}
