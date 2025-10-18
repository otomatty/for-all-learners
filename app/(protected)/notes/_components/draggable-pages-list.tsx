"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type DraggablePageItemProps = {
	id: string;
	title: string;
	href: string;
	isDragging?: boolean;
	isCurrentPage?: boolean;
	children?: React.ReactNode;
};

export function DraggablePageItem({
	id,
	title,
	href,
	isDragging = false,
	isCurrentPage = false,
	children,
}: DraggablePageItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging: sortableIsDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const isBeingDragged = isDragging || sortableIsDragging;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"group relative flex items-center gap-2 p-2 rounded-md transition-all",
				isCurrentPage && "bg-accent",
				isBeingDragged && "opacity-50 z-50",
			)}
		>
			{/* ドラッグハンドル */}
			<button
				{...attributes}
				{...listeners}
				className={cn(
					"opacity-0 group-hover:opacity-100 transition-opacity",
					"p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing",
					isBeingDragged && "opacity-100",
				)}
				type="button"
				aria-label="ページをドラッグ"
			>
				<GripVertical className="h-4 w-4 text-muted-foreground" />
			</button>

			{/* ページリンク */}
			<Link
				href={href}
				className={cn(
					"flex-1 text-sm truncate hover:underline",
					isBeingDragged && "pointer-events-none",
					isCurrentPage && "font-medium",
				)}
			>
				{title}
			</Link>

			{/* 追加コンテンツ */}
			{children}
		</div>
	);
}
