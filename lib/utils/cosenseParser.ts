import type { JSONContent } from "@tiptap/core";

/**
 * Convert an array of strings to TipTap JSONContent.
 * Each string corresponds to a paragraph node.
 */
export function toJSONContent(texts: string[]): JSONContent {
	return {
		type: "doc",
		content: texts.map((text) => {
			// If text is empty or only whitespace, render an empty paragraph without text nodes
			if (!text.trim()) {
				return { type: "paragraph" };
			}
			return {
				type: "paragraph",
				content: [{ type: "text", text }],
			};
		}),
	};
}

/**
 * Parse Cosense page lines into TipTap JSONContent.
 * @param lines Array of objects with a text field.
 */
export function parseCosenseLines(lines: Array<{ text: string }>): JSONContent {
	const texts = lines.map((line) => line.text);
	return toJSONContent(texts);
}

/**
 * Parse Cosense list descriptions into TipTap JSONContent.
 * @param descriptions Array of description strings from Cosense list API.
 */
export function parseCosenseDescriptions(descriptions: string[]): JSONContent {
	return toJSONContent(descriptions);
}
