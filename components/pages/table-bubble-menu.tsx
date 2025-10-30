"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react";
import {
	Columns3,
	Rows3,
	Trash2,
	ArrowLeftToLine,
	ArrowRightToLine,
	ArrowUpToLine,
	ArrowDownToLine,
	Merge,
	Split,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface TableBubbleMenuProps {
	editor: Editor | null;
}

/**
 * テーブル選択時に表示されるバブルメニューコンポーネント
 *
 * テーブルが選択されている時のみ表示され、以下の操作を提供：
 * - 行の追加/削除
 * - 列の追加/削除
 * - セルの結合/分割
 * - テーブルの削除
 *
 * @param editor - Tiptapエディターインスタンス
 */
export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
	if (!editor) return null;

	return (
		<TooltipProvider>
			<BubbleMenu
				editor={editor}
				shouldShow={({ editor }) => {
					// テーブル内にカーソルがある場合のみ表示
					return editor.isActive("table");
				}}
				tippyOptions={{
					duration: 100,
					placement: "top",
					offset: [0, 8],
					hideOnClick: false,
					interactive: true,
				}}
			>
				<div className="flex items-center space-x-1 bg-background text-foreground shadow-lg rounded-lg border border-border p-2">
					{/* 行操作 */}
					<div className="flex items-center space-x-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => editor.chain().focus().addRowBefore().run()}
									className="h-8 w-8 p-0"
								>
									<ArrowUpToLine className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>上に行を追加</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => editor.chain().focus().addRowAfter().run()}
									className="h-8 w-8 p-0"
								>
									<ArrowDownToLine className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>下に行を追加</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => editor.chain().focus().deleteRow().run()}
									className="h-8 w-8 p-0"
								>
									<Rows3 className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>行を削除</p>
							</TooltipContent>
						</Tooltip>
					</div>

					<Separator orientation="vertical" className="h-6" />

					{/* 列操作 */}
					<div className="flex items-center space-x-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => editor.chain().focus().addColumnBefore().run()}
									className="h-8 w-8 p-0"
								>
									<ArrowLeftToLine className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>左に列を追加</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => editor.chain().focus().addColumnAfter().run()}
									className="h-8 w-8 p-0"
								>
									<ArrowRightToLine className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>右に列を追加</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => editor.chain().focus().deleteColumn().run()}
									className="h-8 w-8 p-0"
								>
									<Columns3 className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>列を削除</p>
							</TooltipContent>
						</Tooltip>
					</div>

					<Separator orientation="vertical" className="h-6" />

					{/* セル操作 */}
					<div className="flex items-center space-x-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => editor.chain().focus().mergeCells().run()}
									disabled={!editor.can().mergeCells()}
									className="h-8 w-8 p-0"
								>
									<Merge className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>セルを結合</p>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => editor.chain().focus().splitCell().run()}
									disabled={!editor.can().splitCell()}
									className="h-8 w-8 p-0"
								>
									<Split className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>セルを分割</p>
							</TooltipContent>
						</Tooltip>
					</div>

					<Separator orientation="vertical" className="h-6" />

					{/* テーブル削除 */}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => editor.chain().focus().deleteTable().run()}
								className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>テーブルを削除</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</BubbleMenu>
		</TooltipProvider>
	);
}
