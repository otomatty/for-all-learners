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
 * Parse a single Cosense markup line into a TipTap node, using optional relative heading mapping.
 */
function parseStyledLine(
	text: string,
	starLevelMap?: Map<number, number>,
): JSONContent {
	const trimmed = text.trim();
	const match = trimmed.match(/^\[([*\/\-]+)\s(.+?)\]$/);
	if (match) {
		const mods = match[1];
		const contentText = match[2];
		const starCount = (mods.match(/\*/g) || []).length;
		const hasSlash = mods.includes("/");
		const hasDash = mods.includes("-");
		// Pure asterisks >1 => heading using relative mapping
		if (starCount > 1 && !hasSlash && !hasDash) {
			const level = starLevelMap?.get(starCount) ?? Math.min(starCount, 4);
			return {
				type: "heading",
				attrs: { level },
				content: [{ type: "text", text: contentText.trim() }],
			};
		}
		// Inline styling
		const marks: { type: string }[] = [];
		if (starCount > 0) marks.push({ type: "bold" });
		if (hasSlash) marks.push({ type: "italic" });
		if (hasDash) marks.push({ type: "strike" });
		return {
			type: "paragraph",
			content: [
				{
					type: "text",
					text: contentText.trim(),
					...(marks.length ? { marks } : {}),
				},
			],
		};
	}
	// Fallback plain paragraph or empty
	if (!text.trim()) {
		return { type: "paragraph" };
	}
	return {
		type: "paragraph",
		content: [{ type: "text", text }],
	};
}

/**
 * Parse Cosense page lines into TipTap JSONContent, assigning heading levels based on relative asterisk counts.
 */
export function parseCosenseLines(lines: Array<{ text: string }>): JSONContent {
	// Build mapping from star count to heading level (2 and up) based on relative order
	const starSet = new Set<number>();
	for (const { text } of lines) {
		const trimmed = text.trim();
		const match = trimmed.match(/^\[([*\/\-]+)\s/);
		if (match) {
			const mods = match[1];
			if (!mods.includes("/") && !mods.includes("-")) {
				const count = (mods.match(/\*/g) || []).length;
				if (count > 1) starSet.add(count);
			}
		}
	}
	const sortedCounts = Array.from(starSet).sort((a, b) => b - a);
	const starLevelMap = new Map<number, number>();
	for (const [idx, count] of sortedCounts.entries()) {
		starLevelMap.set(count, idx + 2);
	}
	// Map each line using styled parser with relative headings
	const content = lines.map((line) => parseStyledLine(line.text, starLevelMap));
	return { type: "doc", content };
}

/**
 * Parse Cosense list descriptions into TipTap JSONContent, assigning heading levels based on relative asterisk counts.
 */
export function parseCosenseDescriptions(descriptions: string[]): JSONContent {
	// Build mapping from star count to heading level (2 and up) based on relative order
	const starSet = new Set<number>();
	for (const desc of descriptions) {
		const trimmed = desc.trim();
		const match = trimmed.match(/^\[([*\/\-]+)\s/);
		if (match) {
			const mods = match[1];
			if (!mods.includes("/") && !mods.includes("-")) {
				const count = (mods.match(/\*/g) || []).length;
				if (count > 1) starSet.add(count);
			}
		}
	}
	const sortedCounts = Array.from(starSet).sort((a, b) => b - a);
	const starLevelMap = new Map<number, number>();
	for (const [idx, count] of sortedCounts.entries()) {
		starLevelMap.set(count, idx + 2);
	}
	// Map each description using styled parser with relative headings
	const content = descriptions.map((desc) =>
		parseStyledLine(desc, starLevelMap),
	);
	return { type: "doc", content };
}
