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
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ [使用しているファイルがあれば記載]
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tanstack/react-query
 *   ├─ @tiptap/core
 *   └─ @/lib/supabase/client
 *
 * Related Documentation:
 *   └─ docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 *
 * Note: 現在の実装では全ページを取得してクライアントサイドでフィルタリングしています。
 * 将来的には`link_occurrences`テーブルをクエリするか、JSONBに対するクエリを利用して
 * データベース側でフィルタリングすることを推奨します。
 */
export function usePageBacklinks(targetPageId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", "backlinks", targetPageId],
		queryFn: async (): Promise<BacklinkPage[]> => {
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
				throw pagesError;
			}

			if (!pages || pages.length === 0) {
				return [];
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

			return result;
		},
		enabled: !!targetPageId,
	});
}
