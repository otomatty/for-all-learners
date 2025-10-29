import type { JSONContent } from "@tiptap/core";

/**
 * Text node type with marks for type safety
 */
interface JSONTextNode extends JSONContent {
	type: "text";
	text: string;
	marks?: Array<{ type: string; [key: string]: unknown }>;
}

/**
 * Remove legacy link marks (pageLink, link) from a JSONContent document
 * and convert them to unified link marks (unilink).
 *
 * @param doc - The JSONContent document to sanitize
 * @returns A new JSONContent document with legacy marks converted
 */
export function sanitizeContent(doc: JSONContent): JSONContent {
	let legacyMarksFound = 0;
	let legacyMarksConverted = 0;

	const clone = structuredClone(doc) as JSONContent;

	const recurse = (node: JSONContent): JSONContent => {
		const newNode = { ...node } as JSONContent;

		// Convert legacy link and pageLink marks to UnifiedLinkMark
		if (newNode.type === "text") {
			const textNode = newNode as JSONTextNode;
			if (Array.isArray(textNode.marks)) {
				const convertedMarks = textNode.marks.map(
					(mark: {
						type: string;
						attrs?: Record<string, unknown>;
						[key: string]: unknown;
					}) => {
						// Convert legacy pageLink mark to unilink
						if (mark.type === "pageLink") {
							legacyMarksFound++;

							const title = String(mark.attrs?.title || textNode.text || "");
							const pageId = String(mark.attrs?.pageId || "");

							const unilinkMark = {
								type: "unilink",
								attrs: {
									variant: "bracket",
									raw: title,
									text: title,
									key: title.toLowerCase(),
									pageId: pageId || null,
									href: pageId ? `/notes/default/${pageId}` : "#",
									state: pageId ? "exists" : "pending",
									exists: !!pageId,
									markId: `migrated-${Date.now()}-${Math.random()
										.toString(36)
										.slice(2, 8)}`,
								},
							};

							legacyMarksConverted++;
							return unilinkMark;
						} // Convert legacy link mark to unilink (if it's an internal link)
						if (mark.type === "link") {
							legacyMarksFound++;
							const href = String(mark.attrs?.href || "");

							// Check if it's an internal page link (legacy /pages/ path)
							if (href.startsWith("/pages/")) {
								const pageId = href.replace("/pages/", "");
								const text = String(textNode.text || "");

								const unilinkMark = {
									type: "unilink",
									attrs: {
										variant: "bracket",
										raw: text,
										text: text,
										key: text.toLowerCase(),
										pageId,
										href: `/notes/default/${pageId}`, // Convert to new path
										state: "exists",
										exists: true,
										markId: `migrated-${Date.now()}-${Math.random()
											.toString(36)
											.slice(2, 8)}`,
									},
								};

								legacyMarksConverted++;
								return unilinkMark;
							}

							// Keep external links as-is
							return mark;
						}

						// Keep other marks as-is
						return mark;
					},
				);

				if (convertedMarks.length > 0) {
					textNode.marks = convertedMarks;
				} else {
					const { marks: _marks, ...rest } = textNode;
					return rest as JSONContent;
				}
			}
		}

		if (Array.isArray(newNode.content)) {
			newNode.content = newNode.content.map(recurse);
			if (newNode.type === "paragraph") {
				// Filter out empty or whitespace-only text nodes
				newNode.content = newNode.content.filter((child: JSONContent) => {
					if (child.type === "text" && typeof child.text === "string") {
						return child.text.trim() !== "";
					}
					return true;
				});
				if (newNode.content.length === 0) {
					// Remove empty content property
					const { content: _content, ...rest } = newNode;
					return rest as JSONContent;
				}
			}
		}
		return newNode;
	};

	clone.content = (clone.content ?? []).map(recurse);

	if (legacyMarksFound > 0) {
		// Log legacy mark conversion for debugging
		// biome-ignore lint/suspicious/noConsole: Debug logging for legacy mark conversion
		console.log(
			`[content-sanitizer] Found ${legacyMarksFound} legacy marks, converted ${legacyMarksConverted} to unilink`,
		);
	}

	return clone;
}

/**
 * Remove legacy pageLink and link marks from a single node
 *
 * @param node - The JSONContent node to process
 * @returns A new JSONContent node with legacy marks removed
 */
export function removeLegacyMarks(node: JSONContent): JSONContent {
	if (node.type !== "text") {
		return node;
	}

	const textNode = node as JSONTextNode;
	if (!Array.isArray(textNode.marks)) {
		return node;
	}

	const filteredMarks = textNode.marks.filter(
		(mark) => mark.type !== "pageLink" && mark.type !== "link",
	);

	if (filteredMarks.length === 0) {
		const { marks: _marks, ...rest } = textNode;
		return rest as JSONContent;
	}

	return {
		...textNode,
		marks: filteredMarks,
	};
}

/**
 * Remove empty text nodes from a JSONContent document
 *
 * @param node - The JSONContent node to process
 * @returns A new JSONContent node with empty text nodes removed
 */
export function removeEmptyTextNodes(node: JSONContent): JSONContent {
	const newNode = { ...node };

	if (Array.isArray(newNode.content)) {
		newNode.content = newNode.content
			.map((child) => removeEmptyTextNodes(child))
			.filter((child: JSONContent) => {
				// Remove empty or whitespace-only text nodes
				if (child.type === "text" && typeof child.text === "string") {
					return child.text.trim() !== "";
				}
				return true;
			});

		// If paragraph has no content, remove the content property
		if (newNode.type === "paragraph" && newNode.content.length === 0) {
			const { content: _content, ...rest } = newNode;
			return rest as JSONContent;
		}
	}

	return newNode;
}
