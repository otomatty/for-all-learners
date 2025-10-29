"use server";

import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";

/**
 * Get pages that link to the target page (backlinks)
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを使用):
 *   └─ app/(protected)/pages/[id]/_components/backlinks-grid.tsx
 *
 * Dependencies (依存先):
 *   ├─ @/lib/supabase/server
 *   └─ @/types/database.types
 *
 * Related Files:
 *   └─ Spec: TBD
 */

interface BacklinkPage {
	id: string;
	title: string;
	thumbnail_url: string | null;
	content_tiptap: JSONContent;
	updated_at: string | null;
}

export async function getPageBacklinks(
	targetPageId: string,
): Promise<{ data: BacklinkPage[] | null; error: string | null }> {
	try {
		const supabase = await createClient();

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
}
