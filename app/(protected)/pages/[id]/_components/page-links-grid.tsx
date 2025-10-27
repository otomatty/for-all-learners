"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface PageLinksGridProps {
	missingLinks: string[];
	/** note内ページの場合のnoteSlug */
	noteSlug?: string;
}

export default function PageLinksGrid({
	missingLinks,
	noteSlug,
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
				toast.error("ページ作成に失敗しました");
				return;
			}

			// noteSlugが指定されている場合はnoteに関連付け
			if (noteSlug) {
				// noteIDを取得
				const { data: note, error: noteError } = await supabase
					.from("notes")
					.select("id")
					.eq("slug", noteSlug)
					.single();

				if (!noteError && note) {
					// note_page_linksに挿入
					await supabase
						.from("note_page_links")
						.insert({ note_id: note.id, page_id: insertedPage.id });
				}
			}
			// 適切なURLにリダイレクト
			const redirectUrl = noteSlug
				? `/notes/${encodeURIComponent(noteSlug)}/${insertedPage.id}?newPage=true`
				: `/pages/${insertedPage.id}?newPage=true`;
			router.push(redirectUrl);
		},
		[router, noteSlug],
	);

	return (
		<div className="my-8 space-y-8 min-h-[300px]">
			{/* 未設定リンク一覧 */}
			{missingLinks && missingLinks.length > 0 && (
				<section>
					<h2 className="text-lg font-semibold mb-2">未設定リンク一覧</h2>
					<div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
						{missingLinks.map((name) => (
							<Card
								key={name}
								className="h-full overflow-hidden transition-all hover:shadow-md py-2 md:py-4 gap-2 cursor-pointer"
								onClick={() => handleMissingLinkClick(name)}
							>
								<CardHeader className="px-2 md:px-4">
									<CardTitle className="text-muted-foreground">
										{name}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2 px-2 md:px-4">
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
