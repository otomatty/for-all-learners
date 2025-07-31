"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";
import { useDraggable } from "@dnd-kit/core";
import { FileText, GripVertical, MoreHorizontal } from "lucide-react";
import Link from "next/link";

type PageRow = Database["public"]["Tables"]["pages"]["Row"];

interface DraggablePageItemProps {
	page: PageRow;
	isSelected: boolean;
	onSelect: (pageId: string, checked: boolean) => void;
}

export default function DraggablePageItem({
	page,
	isSelected,
	onSelect,
}: DraggablePageItemProps) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({
			id: page.id,
		});

	const updatedAt = new Date(
		page.updated_at || page.created_at || new Date(),
	).toLocaleDateString("ja-JP");

	const style = {
		transform: transform
			? `translate3d(${transform.x}px, ${transform.y}px, 0)`
			: undefined,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"border rounded-lg p-3 transition-colors group",
				"hover:bg-accent/50",
				isSelected && "bg-accent border-primary",
				isDragging && "opacity-50",
			)}
		>
			<div className="flex items-start gap-3">
				{/* ドラッグハンドル */}
				<div
					{...listeners}
					{...attributes}
					className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
				>
					<GripVertical className="h-4 w-4 text-muted-foreground" />
				</div>

				{/* 選択チェックボックス */}
				<Checkbox
					checked={isSelected}
					onCheckedChange={(checked) => onSelect(page.id, checked as boolean)}
					className="mt-1"
				/>

				{/* ページ情報 */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
						<Link
							href={`/pages/${page.id}`}
							className="font-medium hover:underline truncate"
						>
							{page.title}
						</Link>
					</div>

					<div className="text-xs text-muted-foreground">
						<div>更新: {updatedAt}</div>
					</div>
				</div>

				{/* アクションボタン */}
				<Button
					variant="ghost"
					size="sm"
					className="opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
