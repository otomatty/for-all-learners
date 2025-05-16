"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { JSONContent } from "@tiptap/core";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// テキストノード用型定義と型ガード
type JSONTextNode = JSONContent & { type: "text"; text: string };
function isTextNode(node: JSONContent): node is JSONTextNode {
	const textNode = node as JSONTextNode;
	return textNode.type === "text" && typeof textNode.text === "string";
}
interface PageLinksGridProps {
	outgoingPages: {
		id: string;
		title: string;
		thumbnail_url: string | null;
		content_tiptap: JSONContent;
	}[];
	nestedLinks: Record<string, string[]>;
	missingLinks: string[];
}

// JSONContent からプレーンテキストを抽出するヘルパー
function extractText(node: JSONContent): string {
	if (isTextNode(node)) {
		return node.text;
	}
	if (Array.isArray(node.content)) {
		return node.content.map(extractText).join("");
	}
	return "";
}

export default function PageLinksGrid({
	outgoingPages,
	nestedLinks,
	missingLinks,
}: PageLinksGridProps) {
	const router = useRouter();
	const handleMissingLinkClick = React.useCallback(
		async (name: string) => {
			const supabase = createClient();
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				toast.error("ログインしてください");
				return;
			}
			const { data: insertedPage, error: insertError } = await supabase
				.from("pages")
				.insert({
					user_id: user.id,
					title: name,
					content_tiptap: { type: "doc", content: [] },
					is_public: false,
				})
				.select("id")
				.single();
			if (insertError || !insertedPage) {
				console.error("ページ作成失敗:", insertError);
				toast.error("ページ作成に失敗しました");
				return;
			}
			router.push(`/pages/${insertedPage.id}?newPage=true`);
		},
		[router],
	);

	return (
		<div className="my-8 space-y-8 min-h-[300px]">
			{outgoingPages.length > 0 && (
				<section className="max-w-5xl mx-auto">
					<h2 className="text-lg font-semibold mb-2">このページのリンク一覧</h2>
					<div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{outgoingPages.map((page) => (
							<Link
								key={page.id}
								href={`/pages/${page.id}`}
								className="block h-full"
							>
								<Card className="h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2">
									<CardHeader>
										<CardTitle>{page.title}</CardTitle>
									</CardHeader>
									<CardContent>
										{page.thumbnail_url ? (
											<Image
												src={page.thumbnail_url}
												alt={page.title}
												width={400}
												height={200}
												className="w-full h-32 object-contain mb-2"
											/>
										) : (
											(() => {
												const text = extractText(page.content_tiptap)
													.replace(/\s+/g, " ")
													.trim();
												return (
													text && (
														<p className="line-clamp-5 text-sm text-muted-foreground mb-2">
															{text}
														</p>
													)
												);
											})()
										)}
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				</section>
			)}
			{missingLinks.length > 0 && (
				<section className="max-w-5xl mx-auto">
					<h2 className="text-lg font-semibold mb-2">未設定リンク一覧</h2>
					<div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{missingLinks.map((name) => (
							<Card
								key={name}
								className="h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2 cursor-pointer"
								onClick={() => handleMissingLinkClick(name)}
							>
								<CardHeader>
									<CardTitle className="text-muted-foreground">
										{name}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<div className="h-4 bg-gray-200 rounded w-full" />
									<div className="h-4 bg-gray-200 rounded w-full" />
									<div className="h-4 bg-gray-200 rounded w-full" />
									<div className="h-4 bg-gray-200 rounded w-full" />
									<div className="h-4 bg-gray-200 rounded w-3/4" />
								</CardContent>
							</Card>
						))}
					</div>
				</section>
			)}
		</div>
	);
}
