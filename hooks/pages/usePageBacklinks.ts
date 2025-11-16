"use client";

import { useQuery } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/client";

interface BacklinkPage {
	id: string;
	title: string;
	thumbnail_url: string | null;
	content_tiptap: JSONContent;
	updated_at: string | null;
}

/**
 * 指定されたページへのバックリンク（他のページからのリンク）を取得します。
 */
export function usePageBacklinks(targetPageId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", "backlinks", targetPageId],
		queryFn: async (): Promise<{
			data: BacklinkPage[] | null;
			error: string | null;
		}> => {
			try {
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();
				if (userError || !user) throw new Error("User not authenticated");

				// Get all pages that might contain links to the target page
				const { data: pages, error: pagesError } = await supabase
					.from("pages")
					.select("id, title, thumbnail_url, content_tiptap, updated_at")
					.neq("id", targetPageId); // Exclude the target page itself

				if (pagesError) {
					return { data: null, error: "ページの取得に失敗しました" };
				}

				if (!pages || pages.length === 0) {
					return { data: [], error: null };
				}

				// Filter pages that contain links to the target page
				const backlinks = pages.filter((page) => {
					if (!page.content_tiptap) return false;

					// Convert content to string for searching
					const contentStr = JSON.stringify(page.content_tiptap);

					// Check if the content contains the target page ID
					// This will match both UniLink format and regular link format
					return contentStr.includes(targetPageId);
				});

				// Map to the desired format (same as link groups)
				const result: BacklinkPage[] = backlinks.map((page) => ({
					id: page.id,
					title: page.title,
					thumbnail_url: page.thumbnail_url,
					content_tiptap: page.content_tiptap as JSONContent,
					updated_at: page.updated_at ?? "",
				}));

				return { data: result, error: null };
			} catch {
				return {
					data: null,
					error: "予期しないエラーが発生しました",
				};
			}
		},
		enabled: !!targetPageId,
	});
}
