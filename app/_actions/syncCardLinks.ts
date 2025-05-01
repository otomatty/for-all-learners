"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { JSONContent } from "@tiptap/core";
// Define a generic MarkJSON type for tiptap marks
type MarkJSON = { type: string; attrs?: Record<string, unknown> };

/**
 * Synchronize pageLink marks for a given card:
 * 1. Traverse front_content JSON to collect all pageLink marks.
 * 2. For each mark, ensure the page exists (create if missing).
 * 3. Update the card_page_links table to reflect current links.
 * 4. Update the cards.front_content JSON with correct pageId attrs.
 * @returns Updated JSONContent with pageId attributes set.
 */
export async function syncCardLinks(
	cardId: string,
	content: JSONContent,
): Promise<JSONContent> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw authError || new Error("Authentication required");
	}

	// Collect all pageLink entries from JSON
	type Entry = { pageName: string; pageId: string | null };
	const entries: Entry[] = [];
	function traverse(node: JSONContent) {
		if (node.marks && Array.isArray(node.marks)) {
			const marks = node.marks as MarkJSON[];
			const mark = marks.find((m) => m.type === "pageLink");
			if (mark && typeof mark.attrs?.pageName === "string") {
				entries.push({
					pageName: mark.attrs.pageName,
					pageId: (mark.attrs.pageId as string) ?? null,
				});
			}
		}
		if (node.content && Array.isArray(node.content)) {
			node.content.forEach(traverse);
		}
	}
	traverse(content);

	// Deduplicate by pageName, preserving any existing pageId
	const unique = Array.from(
		new Map(entries.map((e) => [e.pageName, e])).values(),
	);

	// Ensure pages exist and build a map pageName -> pageId
	const linkMap = new Map<string, string>();
	for (const { pageName, pageId } of unique) {
		let finalId = pageId;
		if (!finalId) {
			// Check existing page
			const { data: existing, error: selErr } = await supabase
				.from("pages")
				.select("id")
				.eq("user_id", user.id)
				.eq("title", pageName)
				.single();
			if (selErr || !existing) {
				// Create new page
				const defaultContent = {
					type: "doc",
					content: [],
				} as Database["public"]["Tables"]["pages"]["Row"]["content_tiptap"];
				const { data: created, error: insErr } = await supabase
					.from("pages")
					.insert({
						user_id: user.id,
						title: pageName,
						content_tiptap: defaultContent,
						is_public: false,
					})
					.select("id")
					.single();
				if (insErr || !created) {
					throw insErr || new Error("Failed to create page");
				}
				finalId = created.id;
			} else {
				finalId = existing.id;
			}
		}
		linkMap.set(pageName, finalId);
	}

	// Refresh card_page_links: delete old and insert new
	await supabase.from("card_page_links").delete().eq("card_id", cardId);
	const inserts = Array.from(linkMap.values()).map((pid) => ({
		card_id: cardId,
		page_id: pid,
	}));
	if (inserts.length > 0) {
		const { error: linkErr } = await supabase
			.from("card_page_links")
			.insert(inserts);
		if (linkErr) throw linkErr;
	}

	// Update JSONContent with correct pageId attributes
	function updateNode(node: JSONContent): JSONContent {
		const n = { ...node };
		if (n.marks && Array.isArray(n.marks)) {
			const marks = n.marks as MarkJSON[];
			n.marks = marks.map((m) => {
				if (m.type === "pageLink" && typeof m.attrs?.pageName === "string") {
					const pid = linkMap.get(m.attrs.pageName);
					if (pid) {
						return { ...m, attrs: { ...m.attrs, pageId: pid } };
					}
				}
				return m;
			});
		}
		if (n.content && Array.isArray(n.content)) {
			n.content = n.content.map(updateNode);
		}
		return n;
	}
	const updatedContent: JSONContent = {
		...content,
		content: Array.isArray(content.content)
			? content.content.map(updateNode)
			: [],
	};

	// Persist updated front_content
	const { error: updErr } = await supabase
		.from("cards")
		.update({ front_content: updatedContent })
		.eq("id", cardId);
	if (updErr) throw updErr;

	return updatedContent;
}
