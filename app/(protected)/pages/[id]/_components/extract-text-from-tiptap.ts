/**
 * Extract plain text from TipTap JSON content
 * Helper function for displaying preview text in cards
 */

import type { JSONContent } from "@tiptap/core";

/**
 * Recursively extract text from TipTap JSON node
 */
export function extractTextFromTiptap(node: JSONContent): string {
	if (typeof node === "string") return node;
	if (Array.isArray(node)) return node.map(extractTextFromTiptap).join("");
	if (node !== null && typeof node === "object") {
		const obj = node as Record<string, unknown>;
		if ("text" in obj && typeof obj.text === "string") return obj.text;
		if ("content" in obj && Array.isArray(obj.content)) {
			return obj.content.map(extractTextFromTiptap).join("");
		}
	}
	return "";
}
