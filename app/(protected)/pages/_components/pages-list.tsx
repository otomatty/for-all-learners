"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAllowedImageDomain } from "@/lib/utils/domainValidation";
import type { Database, Json } from "@/types/database.types";
import Image from "next/image";
import Link from "next/link";

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
			{pages.map((page) => (
				<Link key={page.id} href={`/pages/${encodeURIComponent(page.id)}`}>
					<Card className="h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2">
						<CardHeader className="px-4 py-2">
							<CardTitle>{page.title}</CardTitle>
						</CardHeader>
						<CardContent className="px-4">
							{page.thumbnail_url ? (
								isAllowedImageDomain(
									page.thumbnail_url,
									true,
									`[PagesList:${page.title}]`,
								) ? (
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
										<br />
										<span className="text-xs">URL: {page.thumbnail_url}</span>
									</div>
								)
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
			))}
		</div>
	);
}
