"use client";

/**
 * Grouped Page Card Component
 * Displays pages that reference the same link (part of a link group)
 */

import type { JSONContent } from "@tiptap/core";
import { PageCard } from "@/components/notes/PageCard";
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

	const text = extractTextFromTiptap(page.content_tiptap)
		.replace(/\s+/g, " ")
		.trim();

	return (
		<PageCard
			title={page.title}
			href={href}
			thumbnailUrl={page.thumbnail_url}
			contentPreview={text || undefined}
			variant="default"
		/>
	);
}
