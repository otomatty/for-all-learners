"use server";

import { createClient } from "@/lib/supabase/server";
import type { JSONContent } from "@tiptap/core";

/**
 * Update pageLink marks in incoming pages when the current page's title changes.
 */
export async function updateIncomingPageLinks({
	currentPageId,
	oldTitle,
	newTitle,
	incomingPageIds,
}: {
	currentPageId: string;
	oldTitle: string;
	newTitle: string;
	incomingPageIds: string[];
}) {
	const supabase = await createClient();

	// Helper to update pageLink names in a document
	function updateLinkNamesInDoc(
		doc: JSONContent,
		pageId: string,
		title: string,
	): JSONContent {
		const clone = structuredClone(doc) as JSONContent;
		function recurse(node: JSONContent): JSONContent {
			const newNode = { ...node } as JSONContent;
			if (newNode.marks) {
				newNode.marks = newNode.marks.map((mark) => {
					if (mark.type === "pageLink" && mark.attrs?.pageId === pageId) {
						return { ...mark, attrs: { ...mark.attrs, pageName: title } };
					}
					return mark;
				});
			}
			if (Array.isArray(newNode.content)) {
				newNode.content = newNode.content.map(recurse);
			}
			return newNode;
		}
		clone.content = clone.content?.map(recurse) ?? [];
		return clone;
	}

	for (const id of incomingPageIds) {
		// Fetch the page content
		const { data, error } = await supabase
			.from("pages")
			.select("content_tiptap")
			.eq("id", id)
			.single();
		if (error) throw error;
		const content = data.content_tiptap as JSONContent;

		// Update link names
		const updatedContent = updateLinkNamesInDoc(
			content,
			currentPageId,
			newTitle,
		);

		// Persist updated content
		const { error: updateErr } = await supabase
			.from("pages")
			.update({ content_tiptap: updatedContent })
			.eq("id", id);
		if (updateErr) throw updateErr;
	}

	return { success: true };
}
