"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Folder, FolderOpen } from "lucide-react";
import type { NoteSummary } from "../../_components/notes-list";

interface DroppableNoteItemProps {
	note: NoteSummary;
	isSelected: boolean;
	onSelect: (noteId: string) => void;
}

export default function DroppableNoteItem({
	note,
	isSelected,
	onSelect
}: DroppableNoteItemProps) {
	const { isOver, setNodeRef } = useDroppable({
		id: note.id,
	});

	const getVisibilityIcon = (visibility: string) => {
		switch (visibility) {
			case "public":
				return "🌐";
			case "unlisted":
				return "🔗";
			case "invite":
				return "👥";
			default:
				return "🔒";
		}
	};

	const getVisibilityColor = (visibility: string) => {
		switch (visibility) {
			case "public":
				return "secondary";
			case "unlisted":
				return "outline";
			case "invite":
				return "default";
			default:
				return "destructive";
		}
	};

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"p-3 rounded-md cursor-pointer transition-colors",
				"hover:bg-accent/50 border border-transparent",
				isSelected && "bg-accent border-border shadow-sm",
				isOver && "bg-primary/10 border-primary border-dashed"
			)}
			onClick={() => onSelect(note.id)}
		>
			<div className="flex items-center gap-2 mb-2">
				{isSelected ? (
					<FolderOpen className="h-4 w-4 text-primary" />
				) : (
					<Folder className="h-4 w-4 text-muted-foreground" />
				)}
				<span className="text-sm font-medium truncate flex-1">
					{note.title}
				</span>
				<span className="text-xs">
					{getVisibilityIcon(note.visibility)}
				</span>
			</div>
			
			<div className="flex items-center justify-between">
				<span className="text-xs text-muted-foreground">
					{note.pageCount}ページ
				</span>
				<Badge 
					variant={getVisibilityColor(note.visibility) as any}
					className="text-xs"
				>
					{note.visibility === "public" ? "公開" :
					 note.visibility === "unlisted" ? "限定" :
					 note.visibility === "invite" ? "招待" : "非公開"}
				</Badge>
			</div>

			{/* 更新日時 */}
			<div className="text-xs text-muted-foreground mt-1">
				{new Date(note.updatedAt).toLocaleDateString("ja-JP")}
			</div>

			{/* ドロップフィードバック */}
			{isOver && (
				<div className="absolute inset-0 bg-primary/5 border border-primary border-dashed rounded-md flex items-center justify-center">
					<span className="text-xs font-medium text-primary">
						ここにドロップ
					</span>
				</div>
			)}
		</div>
	);
}