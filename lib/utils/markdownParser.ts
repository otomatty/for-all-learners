/**
 * Markdown Parser Utility
 *
 * Converts common Markdown syntax to Tiptap JSONContent format
 * Used for paste event handling to automatically convert Markdown to rich text
 */

import type { JSONContent } from "@tiptap/core";
import type { TableData } from "./markdownTableParser";
import { parseMarkdownTable } from "./markdownTableParser";

/**
 * Convert TableData to TipTap JSONContent format
 */
function convertTableToJSON(tableData: TableData): JSONContent {
	const { headers, alignments, rows } = tableData;

	// Create header row
	const headerRow: JSONContent = {
		type: "tableRow",
		content: headers.map((header, index) => ({
			type: "tableHeader",
			attrs: {
				textAlign: alignments[index] || "left",
			},
			content: [
				{
					type: "paragraph",
					content: header ? [{ type: "text", text: header }] : [],
				},
			],
		})),
	};

	// Create data rows
	const dataRows: JSONContent[] = rows.map((row) => ({
		type: "tableRow",
		content: row.map((cell, index) => ({
			type: "tableCell",
			attrs: {
				textAlign: alignments[index] || "left",
			},
			content: [
				{
					type: "paragraph",
					content: cell ? [{ type: "text", text: cell }] : [],
				},
			],
		})),
	}));

	return {
		type: "table",
		content: [headerRow, ...dataRows],
	};
}

/**
 * Parse Markdown text and convert to Tiptap JSONContent
 *
 * @param text - Raw Markdown text
 * @returns JSONContent array representing the parsed content
 */
export function parseMarkdownToNodes(text: string): JSONContent[] {
	// Check if text contains a Markdown table first
	const tableData = parseMarkdownTable(text.trim());
	if (tableData) {
		// Convert table data to TipTap JSONContent
		return [convertTableToJSON(tableData)];
	}

	const lines = text.split("\n");
	const nodes: JSONContent[] = [];
	let currentListItems: JSONContent[] = [];
	let currentListType: "bulletList" | "orderedList" | null = null;
	let inCodeBlock = false;
	let codeBlockLines: string[] = [];
	let codeBlockLanguage = "";

	const flushList = () => {
		if (currentListItems.length > 0 && currentListType) {
			nodes.push({
				type: currentListType,
				content: currentListItems,
			});
			currentListItems = [];
			currentListType = null;
		}
	};

	const flushCodeBlock = () => {
		if (codeBlockLines.length > 0) {
			nodes.push({
				type: "codeBlock",
				attrs: {
					language: codeBlockLanguage || "plaintext",
				},
				content: [
					{
						type: "text",
						text: codeBlockLines.join("\n"),
					},
				],
			});
			codeBlockLines = [];
			codeBlockLanguage = "";
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Handle code blocks
		if (line.startsWith("```")) {
			if (!inCodeBlock) {
				// Start code block
				flushList();
				inCodeBlock = true;
				codeBlockLanguage = line.slice(3).trim();
			} else {
				// End code block
				inCodeBlock = false;
				flushCodeBlock();
			}
			continue;
		}

		if (inCodeBlock) {
			codeBlockLines.push(line);
			continue;
		}

		// Handle headings (##, ###, etc.)
		const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
		if (headingMatch) {
			flushList();
			const level = headingMatch[1].length;
			const text = headingMatch[2];
			nodes.push({
				type: "heading",
				attrs: { level },
				content: parseInlineMarks(text),
			});
			continue;
		}

		// Handle blockquote (> text)
		const blockquoteMatch = line.match(/^>\s+(.+)$/);
		if (blockquoteMatch) {
			flushList();
			nodes.push({
				type: "blockquote",
				content: [
					{
						type: "paragraph",
						content: parseInlineMarks(blockquoteMatch[1]),
					},
				],
			});
			continue;
		}

		// Handle horizontal rule (---, ***, ___)
		if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
			flushList();
			nodes.push({
				type: "horizontalRule",
			});
			continue;
		}

		// Handle unordered list (-, *, +)
		const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
		if (bulletMatch) {
			if (currentListType !== "bulletList") {
				flushList();
				currentListType = "bulletList";
			}
			currentListItems.push({
				type: "listItem",
				content: [
					{
						type: "paragraph",
						content: parseInlineMarks(bulletMatch[1]),
					},
				],
			});
			continue;
		}

		// Handle ordered list (1. item)
		const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
		if (orderedMatch) {
			if (currentListType !== "orderedList") {
				flushList();
				currentListType = "orderedList";
			}
			currentListItems.push({
				type: "listItem",
				content: [
					{
						type: "paragraph",
						content: parseInlineMarks(orderedMatch[1]),
					},
				],
			});
			continue;
		}

		// Handle empty lines
		if (line.trim() === "") {
			flushList();
			// Skip empty lines - they're just separators between blocks
			// Don't create empty paragraphs to avoid extra spacing
			continue;
		}

		// Handle regular paragraph
		flushList();
		nodes.push({
			type: "paragraph",
			content: parseInlineMarks(line),
		});
	}

	// Flush any remaining list or code block
	flushList();
	if (inCodeBlock) {
		flushCodeBlock();
	}

	return nodes;
}

/**
 * Parse inline Markdown marks (bold, italic, code, links)
 *
 * @param text - Text with inline Markdown syntax
 * @returns JSONContent array with marks applied
 */
export function parseInlineMarks(text: string): JSONContent[] {
	const nodes: JSONContent[] = [];

	// Pattern priority:
	// 1. Links [text](url)
	// 2. Inline code `code`
	// 3. Bold **text** or __text__
	// 4. Italic *text* or _text_

	const patterns = [
		// Links: [text](url)
		{
			regex: /\[([^\]]+)\]\(([^)]+)\)/g,
			handler: (match: RegExpMatchArray) => ({
				type: "text",
				marks: [
					{
						type: "link",
						attrs: {
							href: match[2],
							target: "_blank",
							rel: "noopener noreferrer nofollow",
						},
					},
				],
				text: match[1],
			}),
		},
		// Inline code: `code`
		{
			regex: /`([^`]+)`/g,
			handler: (match: RegExpMatchArray) => ({
				type: "text",
				marks: [{ type: "code" }],
				text: match[1],
			}),
		},
		// Bold: **text**
		{
			regex: /\*\*([^*]+)\*\*/g,
			handler: (match: RegExpMatchArray) => ({
				type: "text",
				marks: [{ type: "bold" }],
				text: match[1],
			}),
		},
		// Bold: __text__
		{
			regex: /__([^_]+)__/g,
			handler: (match: RegExpMatchArray) => ({
				type: "text",
				marks: [{ type: "bold" }],
				text: match[1],
			}),
		},
		// Italic: *text* (not ** which is bold)
		{
			regex: /(?<!\*)\*([^*]+)\*(?!\*)/g,
			handler: (match: RegExpMatchArray) => ({
				type: "text",
				marks: [{ type: "italic" }],
				text: match[1],
			}),
		},
		// Italic: _text_ (not __ which is bold)
		{
			regex: /(?<!_)_([^_]+)_(?!_)/g,
			handler: (match: RegExpMatchArray) => ({
				type: "text",
				marks: [{ type: "italic" }],
				text: match[1],
			}),
		},
	];

	// Find all matches across all patterns
	interface Match {
		index: number;
		length: number;
		node: JSONContent;
	}

	const allMatches: Match[] = [];

	for (const pattern of patterns) {
		pattern.regex.lastIndex = 0; // Reset regex state
		let match = pattern.regex.exec(text);

		while (match !== null) {
			allMatches.push({
				index: match.index ?? 0,
				length: match[0].length,
				node: pattern.handler(match),
			});
			match = pattern.regex.exec(text);
		}
	}

	// Sort matches by position
	allMatches.sort((a, b) => a.index - b.index);

	// Build nodes array avoiding overlaps
	let lastIndex = 0;
	for (const match of allMatches) {
		// Skip overlapping matches
		if (match.index < lastIndex) continue;

		// Add plain text before the match
		if (match.index > lastIndex) {
			const plainText = text.slice(lastIndex, match.index);
			if (plainText) {
				nodes.push({
					type: "text",
					text: plainText,
				});
			}
		}

		// Add the matched node
		nodes.push(match.node);
		lastIndex = match.index + match.length;
	}

	// Add remaining plain text
	if (lastIndex < text.length) {
		const plainText = text.slice(lastIndex);
		if (plainText) {
			nodes.push({
				type: "text",
				text: plainText,
			});
		}
	}

	// If no matches found, return plain text
	if (nodes.length === 0 && text) {
		nodes.push({
			type: "text",
			text: text,
		});
	}

	return nodes;
}

/**
 * Check if text contains any Markdown syntax
 *
 * @param text - Text to check
 * @returns true if Markdown syntax is detected
 */
export function containsMarkdownSyntax(text: string): boolean {
	const patterns = [
		/^#{2,6}\s+/, // Headings
		/^\s*[-*+]\s+/, // Bullet lists
		/^\s*\d+\.\s+/, // Ordered lists
		/^>\s+/, // Blockquotes
		/^```/, // Code blocks
		/\*\*[^*]+\*\*/, // Bold **
		/__[^_]+__/, // Bold __
		/(?<!\*)\*[^*]+\*(?!\*)/, // Italic * (not **)
		/(?<!_)_[^_]+_(?!_)/, // Italic _ (not __)
		/`[^`]+`/, // Inline code
		/\[[^\]]+\]\([^)]+\)/, // Links
		/^(-{3,}|\*{3,}|_{3,})$/, // Horizontal rules
		/^\|(.+\|.+)\s*\n\s*\|(:?-+:?\|:?-+:?.*)/, // Tables
	];

	return patterns.some((pattern) => pattern.test(text));
}
