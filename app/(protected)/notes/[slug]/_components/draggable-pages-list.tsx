"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { Json } from "@/types/database.types";

type Page = {
	id: string;
	title: string;
	thumbnail_url: string | null;
	content_tiptap: Json;
};

type DraggablePageItemProps = {
	page: Page;
	slug: string;
	extractTextFromTiptap: (content: Json) => string;
	isAllowedDomain: (url: string) => boolean;
};

export function DraggablePageItem({
	page,
	slug,
	extractTextFromTiptap,
	isAllowedDomain,
}: DraggablePageItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: page.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="relative group">
			<div
				{...attributes}
				{...listeners}
				className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10"
			>
				<GripVertical className="h-5 w-5 text-muted-foreground" />
			</div>
			<Link
				href={`/notes/${encodeURIComponent(slug)}/${encodeURIComponent(page.id)}`}
				className={cn("block", isDragging && "pointer-events-none")}
			>
				<Card className="h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2">
					<CardHeader className="px-4 py-2">
						<CardTitle>{page.title}</CardTitle>
					</CardHeader>
					<CardContent className="px-4">
						{page.thumbnail_url ? (
							isAllowedDomain(page.thumbnail_url) ? (
								<Image
									src={page.thumbnail_url}
									alt={page.title}
									width={400}
									height={200}
									className="w-full h-32 object-contain"
								/>
							) : (
								<div className="w-full h-32 flex items-center justify-center bg-gray-100 text-sm text-center text-gray-500 p-4">
									この画像のドメインは許可されていません。
								</div>
							)
						) : (
							(() => {
								const text = extractTextFromTiptap(page.content_tiptap)
									.replace(/\\s+/g, " ")
									.trim();
								if (!text) return null;
								return (
									<p className="line-clamp-5 text-sm text-muted-foreground">
										{text}
									</p>
								);
							})()
						)}
					</CardContent>
				</Card>
			</Link>
		</div>
	);
}
