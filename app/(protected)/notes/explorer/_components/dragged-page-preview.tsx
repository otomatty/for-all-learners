"use client";

import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DraggedPagePreviewProps {
	pages: { id: string; title: string }[];
}

export default function DraggedPagePreview({ pages }: DraggedPagePreviewProps) {
	if (pages.length === 0) return null;

	if (pages.length === 1) {
		// 単一ページの場合
		const page = pages[0];
		return (
			<div className="bg-background border border-primary rounded-lg p-3 shadow-lg opacity-90 max-w-xs">
				<div className="flex items-center gap-2">
					<FileText className="h-4 w-4 text-muted-foreground" />
					<span className="font-medium truncate">{page.title}</span>
				</div>
			</div>
		);
	}

	// 複数ページの場合
	return (
		<div className="bg-background border border-primary rounded-lg p-3 shadow-lg opacity-90 max-w-xs">
			<div className="flex items-center gap-2 mb-2">
				<FileText className="h-4 w-4 text-muted-foreground" />
				<span className="font-medium">複数ページ</span>
				<Badge variant="secondary" className="text-xs">
					{pages.length}件
				</Badge>
			</div>
			<div className="text-xs text-muted-foreground space-y-1 max-h-20 overflow-hidden">
				{pages.slice(0, 3).map((page, _index) => (
					<div key={page.id} className="truncate">
						• {page.title}
					</div>
				))}
				{pages.length > 3 && (
					<div className="text-center">...他{pages.length - 3}件</div>
				)}
			</div>
		</div>
	);
}
