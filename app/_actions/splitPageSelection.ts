"use server";
import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";

export type SplitPageSelectionParams = {
	originalPageId: string;
	title: string;
	content: JSONContent;
};

export async function splitPageSelection({
	originalPageId,
	title,
	content,
}: SplitPageSelectionParams) {
	const supabase = await createClient();

	// Fetch original page metadata
	const { data: originalPage, error: originalError } = await supabase
		.from("pages")
		.select("user_id, is_public")
		.eq("id", originalPageId)
		.single();
	if (originalError || !originalPage) {
		throw originalError || new Error("Original page not found");
	}

	// Create new page with same user and visibility
	const { data: newPage, error: createError } = await supabase
		.from("pages")
		.insert({
			user_id: originalPage.user_id,
			title,
			content_tiptap: content,
			is_public: originalPage.is_public,
		})
		.select("id")
		.single();
	if (createError || !newPage) {
		throw createError || new Error("Failed to create new page");
	}

	// Link new page to the same notes as the original
	const { data: noteLinks, error: noteLinksError } = await supabase
		.from("note_page_links")
		.select("note_id")
		.eq("page_id", originalPageId);
	if (noteLinksError) {
		throw noteLinksError;
	}
	if (noteLinks && noteLinks.length > 0) {
		const inserts = noteLinks.map((link) => ({
			note_id: link.note_id,
			page_id: newPage.id,
		}));
		const { error: linkError } = await supabase
			.from("note_page_links")
			.insert(inserts);
		if (linkError) {
			throw linkError;
		}
	}

	return newPage;
}
