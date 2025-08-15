"use client";

import type { Database, Json } from "@/types/database.types";
import { DraggablePageItem } from "./draggable-pages-list";

interface PagesListProps {
	pages: Database["public"]["Tables"]["pages"]["Row"][];
	slug: string;
}

const ALLOWED_DOMAINS = ["scrapbox.io", "gyazo.com", "i.ytimg.com"];

function isAllowedDomain(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		return ALLOWED_DOMAINS.includes(hostname);
	} catch {
		return false;
	}
}

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

export function PagesList({ pages, slug }: PagesListProps) {
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
			{pages.map((page) => (
				<DraggablePageItem
					key={page.id}
					page={page}
					slug={slug}
					extractTextFromTiptap={extractTextFromTiptap}
					isAllowedDomain={isAllowedDomain}
				/>
			))}
		</div>
	);
}
