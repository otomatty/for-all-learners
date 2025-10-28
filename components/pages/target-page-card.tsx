"use client";

/**
 * Target Page Card Component
 * Displays the main page that the link group refers to (when page exists)
 */

import type { JSONContent } from "@tiptap/core";
import { PageCard } from "@/components/notes/PageCard";
import { extractTextFromTiptap } from "./extract-text-from-tiptap";

interface TargetPageCardProps {
	page: {
		id: string;
		title: string;
		thumbnail_url: string | null;
		content_tiptap: JSONContent;
	};
	noteSlug?: string;
}

export function TargetPageCard({ page, noteSlug }: TargetPageCardProps) {
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
			variant="highlighted"
		/>
	);
}
