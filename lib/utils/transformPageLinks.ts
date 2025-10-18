import type { JSONContent } from "@tiptap/core";

// Define MarkJSON for tiptap marks
type MarkJSON = { type: string; attrs?: Record<string, unknown> };

/**
 * Recursively update pageLink marks in the document using pagesMap.
 */
export function transformPageLinks(
	doc: JSONContent,
	pagesMap: Map<string, string>,
): JSONContent {
	const recurse = (node: JSONContent): JSONContent => {
		// Update marks attributes
		if (node.marks) {
			const marks = node.marks as MarkJSON[];
			node.marks = marks.map((mark) => {
				if (mark.type === "pageLink") {
					const name = mark.attrs?.pageName as string;
					const id = pagesMap.get(name) ?? null;
					return { ...mark, attrs: { pageName: name, pageId: id } };
				}
				return mark;
			});
		}
		// Recurse into children
		if (node.content && Array.isArray(node.content)) {
			node.content = node.content.map(recurse);
		}
		return node;
	};
	// Deep clone to avoid mutating original document
	const root = structuredClone(doc) as JSONContent;
	root.content = (root.content ?? []).map(recurse);
	return root;
}
