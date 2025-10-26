"use client";

/**
 * Grouped Page Card Component
 * Displays pages that reference the same link (part of a link group)
 */

import type { JSONContent } from "@tiptap/core";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractTextFromTiptap } from "./extract-text-from-tiptap";

interface GroupedPageCardProps {
	page: {
		id: string;
		title: string;
		thumbnail_url: string | null;
		content_tiptap: JSONContent;
	};
	noteSlug?: string;
}

export function GroupedPageCard({ page, noteSlug }: GroupedPageCardProps) {
	const href = noteSlug
		? `/notes/${encodeURIComponent(noteSlug)}/${page.id}`
		: `/pages/${page.id}`;

	return (
		<Link href={href}>
			<Card className="h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2">
				<CardHeader className="px-4 py-2">
					<CardTitle className="text-sm">{page.title}</CardTitle>
				</CardHeader>
				<CardContent className="px-4">
					{page.thumbnail_url ? (
						<Image
							src={page.thumbnail_url}
							alt={page.title}
							width={400}
							height={200}
							className="w-full h-32 object-contain"
						/>
					) : (
						(() => {
							const text = extractTextFromTiptap(page.content_tiptap)
								.replace(/\s+/g, " ")
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
	);
}
