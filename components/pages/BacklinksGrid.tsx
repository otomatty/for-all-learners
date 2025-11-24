"use client";

import { PageCard } from "@/components/notes/PageCard";
import { Badge } from "@/components/ui/badge";
import { usePageBacklinks } from "@/hooks/pages/usePageBacklinks";
import { extractTextFromTiptap } from "./extract-text-from-tiptap";

/**
 * BacklinksGrid Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ app/(protected)/pages/[id]/_components/page-tabs.tsx
 *
 * Dependencies (依存先):
 *   ├─ @/components/notes/PageCard
 *   ├─ ./extract-text-from-tiptap
 *   └─ sonner
 *
 * Related Files:
 *   └─ Parent: ./page-tabs.tsx
 */

interface BacklinksGridProps {
	pageId: string;
}

export default function BacklinksGrid({ pageId }: BacklinksGridProps) {
	const { data: backlinks = [], isLoading: loading } = usePageBacklinks(pageId);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[200px]">
				<p className="text-muted-foreground">読み込み中...</p>
			</div>
		);
	}

	if (backlinks.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[200px]">
				<p className="text-muted-foreground">
					このページへのリンクはまだありません
				</p>
			</div>
		);
	}

	return (
		<section className="my-8 space-y-6">
			<div className="flex items-center gap-2 mb-4">
				<h2 className="text-lg font-semibold">このページへのリンク</h2>
				<Badge variant="default">{backlinks.length}</Badge>
			</div>
			<div className="grid gap-2 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
				{backlinks.map((page) => {
					const text = extractTextFromTiptap(page.content_tiptap)
						.replace(/\s+/g, " ")
						.trim();

					return (
						<PageCard
							key={page.id}
							title={page.title}
							href={`/notes/default/${page.id}`}
							thumbnailUrl={page.thumbnail_url}
							contentPreview={text || undefined}
						/>
					);
				})}
			</div>
		</section>
	);
}
