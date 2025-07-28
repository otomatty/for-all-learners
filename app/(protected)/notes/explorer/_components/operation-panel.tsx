"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clipboard, Copy, Move, Search, Trash2, X } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NoteSummary } from "../../_components/notes-list";

interface OperationPanelProps {
	selectedPageIds: string[];
	onClearSelection: () => void;
	onMovePages: (targetNoteId: string) => void;
	onCopyPages: (targetNoteId: string) => void;
	notes: NoteSummary[];
}

export default function OperationPanel({
	selectedPageIds,
	onClearSelection,
	onMovePages,
	onCopyPages,
	notes,
}: OperationPanelProps) {
	const hasSelection = selectedPageIds.length > 0;

	const handleDelete = () => {
		// TODO: 削除確認ダイアログを開く
		console.log("削除操作:", selectedPageIds);
	};

	return (
		<div className="border-t bg-muted/30 p-3">
			<div className="flex items-center justify-between">
				{/* 左側: 選択状態とクリアボタン */}
				<div className="flex items-center gap-3">
					{hasSelection ? (
						<>
							<Badge variant="secondary" className="gap-1">
								{selectedPageIds.length}件選択中
							</Badge>
							<Button
								variant="ghost"
								size="sm"
								onClick={onClearSelection}
								className="h-6 px-2"
							>
								<X className="h-3 w-3 mr-1" />
								クリア
							</Button>
						</>
					) : (
						<span className="text-sm text-muted-foreground">
							🗑️ ゴミ箱 | 📋 クリップボード | 🔍 検索結果
						</span>
					)}
				</div>

				{/* 右側: 操作ボタン */}
				{hasSelection && (
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="gap-1"
								>
									<Move className="h-3 w-3" />
									移動
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								{notes.map((note) => (
									<DropdownMenuItem
										key={note.id}
										onClick={() => onMovePages(note.id)}
									>
										📁 {note.title}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
						
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="gap-1"
								>
									<Copy className="h-3 w-3" />
									コピー
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								{notes.map((note) => (
									<DropdownMenuItem
										key={note.id}
										onClick={() => onCopyPages(note.id)}
									>
										📁 {note.title}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						<Separator orientation="vertical" className="h-6" />

						<Button
							variant="outline"
							size="sm"
							onClick={handleDelete}
							className="gap-1 text-destructive hover:text-destructive"
						>
							<Trash2 className="h-3 w-3" />
							削除
						</Button>
					</div>
				)}
			</div>

			{/* 将来的な拡張エリア: ゴミ箱、クリップボード、検索結果 */}
			{!hasSelection && (
				<div className="mt-2 flex gap-4 text-xs text-muted-foreground">
					<div className="flex items-center gap-1">
						<Trash2 className="h-3 w-3" />
						<span>ゴミ箱: 0件</span>
					</div>
					<div className="flex items-center gap-1">
						<Clipboard className="h-3 w-3" />
						<span>クリップボード: 0件</span>
					</div>
					<div className="flex items-center gap-1">
						<Search className="h-3 w-3" />
						<span>検索結果: -</span>
					</div>
				</div>
			)}
		</div>
	);
}
