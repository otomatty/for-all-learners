/**
 * Extract plain text from TipTap JSON content
 * Helper function for displaying preview text in cards
 */

import type { JSONContent } from "@tiptap/core";

/**
 * Recursively extract text from TipTap JSON node
 * @param node - TipTap JSONContent node
 * @param maxLength - Maximum length of extracted text (default: 200)
 * @returns Extracted plain text (trimmed and limited to maxLength)
 */
export function extractTextFromTiptap(
	node: JSONContent,
	maxLength = 200,
): string {
	const extractTextRecursive = (n: JSONContent, isTopLevel = false): string => {
		if (typeof n === "string") return n;
		if (Array.isArray(n)) {
			return n.map((item) => extractTextRecursive(item, isTopLevel)).join(" ");
		}
		if (n !== null && typeof n === "object") {
			const obj = n as Record<string, unknown>;
			const nodeType = obj.type as string | undefined;

			// Direct text node
			if ("text" in obj && typeof obj.text === "string") return obj.text;

			// Node with content array
			if ("content" in obj && Array.isArray(obj.content)) {
				const isBlockElement =
					nodeType &&
					[
						"paragraph",
						"heading",
						"listItem",
						"bulletList",
						"orderedList",
					].includes(nodeType);

				const texts = obj.content
					.map((item) => extractTextRecursive(item, false))
					.filter((text) => text.trim());

				// Add space between block-level elements at doc level
				if (isTopLevel && nodeType === "doc") {
					return texts.join(" ");
				}

				// For block elements, join with space
				return isBlockElement ? texts.join(" ") : texts.join("");
			}
		}
		return "";
	};

	const fullText = extractTextRecursive(node, true).trim().replace(/\s+/g, " ");

	// Limit to maxLength
	if (fullText.length > maxLength) {
		return `${fullText.slice(0, maxLength)}...`;
	}

	return fullText;
}
