"use client";

import { EyeIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface ConflictPreviewProps {
	content: string;
}

export function ConflictPreview({ content }: ConflictPreviewProps) {
	const [open, setOpen] = useState(false);

	// HTMLタグを除去してプレーンテキストにする
	const stripHtml = (html: string) => {
		const tmp = document.createElement("div");
		tmp.innerHTML = html;
		return tmp.textContent || tmp.innerText || "";
	};

	// プレビュー用に文字数を制限
	const previewText = stripHtml(content).slice(0, 200);
	const hasMore = stripHtml(content).length > 200;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<EyeIcon className="h-4 w-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 max-h-60 overflow-y-auto">
				<div className="space-y-2">
					<h4 className="font-medium text-sm">ページプレビュー</h4>
					<div className="text-sm text-muted-foreground leading-relaxed">
						{previewText}
						{hasMore && "..."}
					</div>
					{content.length === 0 && (
						<p className="text-xs text-muted-foreground italic">
							（内容がありません）
						</p>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
