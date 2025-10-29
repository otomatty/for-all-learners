"use client";

import { PageCard } from "@/components/notes/PageCard";
import { isAllowedImageDomain } from "@/lib/utils/domainValidation";
import type { Database, Json } from "@/types/database.types";

interface PagesListProps {
	pages: Database["public"]["Tables"]["pages"]["Row"][];
}

/**
 * Extracts plain text from Tiptap JSON content.
 * @param node - Tiptap JSON node.
 * @returns Plain text representation.
 */
function extractTextFromTiptap(node: Json): string {
	if (typeof node === "string") return node;
	if (Array.isArray(node)) return node.map(extractTextFromTiptap).join("");
	if (node !== null && typeof node === "object") {
		const obj = node as Record<string, Json>;
		if ("text" in obj && typeof obj.text === "string") return obj.text;
		if ("content" in obj && Array.isArray(obj.content)) {
			return obj.content.map(extractTextFromTiptap).join("");
		}
	}
	return "";
}

export function PagesList({ pages }: PagesListProps) {
	if (pages.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-40 border rounded-lg">
				<p className="text-muted-foreground">ページがありません</p>
				<p className="text-sm text-muted-foreground">
					「新規ページ」ボタンからページを作成してください
				</p>
			</div>
		);
	}

	return (
		<div className="grid gap-2 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{pages.map((page) => {
				const text = extractTextFromTiptap(page.content_tiptap)
					.replace(/\s+/g, " ")
					.trim();

				return (
					<PageCard
						key={page.id}
						title={page.title}
						href={`/pages/${encodeURIComponent(page.id)}`}
						thumbnailUrl={page.thumbnail_url}
						contentPreview={text || undefined}
						isImageAllowed={
							page.thumbnail_url
								? isAllowedImageDomain(page.thumbnail_url)
								: true
						}
						showSecurityWarning={true}
					/>
				);
			})}
		</div>
	);
}
