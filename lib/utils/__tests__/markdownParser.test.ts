/**
 * Markdown Parser Tests
 *
 * Tests for parseMarkdownToNodes and parseInlineMarks functions
 */

import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
	containsMarkdownSyntax,
	parseInlineMarks,
	parseMarkdownToNodes,
} from "../markdownParser";

describe("markdownParser", () => {
	describe("containsMarkdownSyntax", () => {
		it("should detect headings", () => {
			expect(containsMarkdownSyntax("## Heading")).toBe(true);
			expect(containsMarkdownSyntax("### Another heading")).toBe(true);
		});

		it("should detect bold text", () => {
			expect(containsMarkdownSyntax("**bold text**")).toBe(true);
			expect(containsMarkdownSyntax("__bold text__")).toBe(true);
		});

		it("should detect italic text", () => {
			expect(containsMarkdownSyntax("*italic text*")).toBe(true);
			expect(containsMarkdownSyntax("_italic text_")).toBe(true);
		});

		it("should detect inline code", () => {
			expect(containsMarkdownSyntax("`code`")).toBe(true);
		});

		it("should detect links", () => {
			expect(containsMarkdownSyntax("[text](url)")).toBe(true);
		});

		it("should detect lists", () => {
			expect(containsMarkdownSyntax("- item")).toBe(true);
			expect(containsMarkdownSyntax("* item")).toBe(true);
			expect(containsMarkdownSyntax("1. item")).toBe(true);
		});

		it("should detect code blocks", () => {
			expect(containsMarkdownSyntax("```javascript")).toBe(true);
		});

		it("should detect blockquotes", () => {
			expect(containsMarkdownSyntax("> quote")).toBe(true);
		});

		it("should detect horizontal rules", () => {
			expect(containsMarkdownSyntax("---")).toBe(true);
			expect(containsMarkdownSyntax("***")).toBe(true);
		});

		it("should return false for plain text", () => {
			expect(containsMarkdownSyntax("Plain text")).toBe(false);
		});
	});

	describe("parseInlineMarks", () => {
		it("should parse bold text", () => {
			const result = parseInlineMarks("This is **bold** text");
			expect(result).toMatchObject([
				{ type: "text", text: "This is " },
				{ type: "text", marks: [{ type: "bold" }], text: "bold" },
				{ type: "text", text: " text" },
			]);
		});

		it("should parse italic text", () => {
			const result = parseInlineMarks("This is *italic* text");
			expect(result).toMatchObject([
				{ type: "text", text: "This is " },
				{ type: "text", marks: [{ type: "italic" }], text: "italic" },
				{ type: "text", text: " text" },
			]);
		});

		it("should parse inline code", () => {
			const result = parseInlineMarks("This is `code` text");
			expect(result).toMatchObject([
				{ type: "text", text: "This is " },
				{ type: "text", marks: [{ type: "code" }], text: "code" },
				{ type: "text", text: " text" },
			]);
		});

		it("should parse links", () => {
			const result = parseInlineMarks("This is [a link](https://example.com)");
			expect(result).toMatchObject([
				{ type: "text", text: "This is " },
				{
					type: "text",
					marks: [
						{
							type: "link",
							attrs: {
								href: "https://example.com",
								target: "_blank",
								rel: "noopener noreferrer nofollow",
							},
						},
					],
					text: "a link",
				},
			]);
		});

		it("should parse mixed formatting", () => {
			const result = parseInlineMarks("**bold** and *italic* and `code`");
			expect(result.length).toBeGreaterThan(0);
			// Check that bold, italic, and code are all present
			const hasBold = result.some((node: JSONContent) =>
				node.marks?.some((mark) => mark.type === "bold"),
			);
			const hasItalic = result.some((node: JSONContent) =>
				node.marks?.some((mark) => mark.type === "italic"),
			);
			const hasCode = result.some((node: JSONContent) =>
				node.marks?.some((mark) => mark.type === "code"),
			);
			expect(hasBold).toBe(true);
			expect(hasItalic).toBe(true);
			expect(hasCode).toBe(true);
		});

		it("should handle plain text", () => {
			const result = parseInlineMarks("Plain text");
			expect(result).toEqual([{ type: "text", text: "Plain text" }]);
		});
	});

	describe("parseMarkdownToNodes", () => {
		it("should parse headings", () => {
			const text = "## Heading 2\n### Heading 3";
			const result = parseMarkdownToNodes(text);
			expect(result).toMatchObject([
				{ type: "heading", attrs: { level: 2 } },
				{ type: "heading", attrs: { level: 3 } },
			]);
		});

		it("should parse bullet lists", () => {
			const text = "- Item 1\n- Item 2";
			const result = parseMarkdownToNodes(text);
			expect(result).toMatchObject([
				{
					type: "bulletList",
					content: [{ type: "listItem" }, { type: "listItem" }],
				},
			]);
		});

		it("should parse ordered lists", () => {
			const text = "1. Item 1\n2. Item 2";
			const result = parseMarkdownToNodes(text);
			expect(result).toMatchObject([
				{
					type: "orderedList",
					content: [{ type: "listItem" }, { type: "listItem" }],
				},
			]);
		});

		it("should parse blockquotes", () => {
			const text = "> This is a quote";
			const result = parseMarkdownToNodes(text);
			expect(result).toMatchObject([
				{
					type: "blockquote",
					content: [{ type: "paragraph" }],
				},
			]);
		});

		it("should parse code blocks", () => {
			const text = "```javascript\nconst x = 1;\n```";
			const result = parseMarkdownToNodes(text);
			expect(result).toMatchObject([
				{
					type: "codeBlock",
					attrs: { language: "javascript" },
					content: [{ type: "text", text: "const x = 1;" }],
				},
			]);
		});

		it("should parse horizontal rules", () => {
			const text = "---";
			const result = parseMarkdownToNodes(text);
			expect(result).toMatchObject([{ type: "horizontalRule" }]);
		});

		it("should parse mixed content", () => {
			const text = "## Heading\n\nParagraph text\n\n- List item";
			const result = parseMarkdownToNodes(text);
			// heading, paragraph, bulletList (empty lines are just separators)
			expect(result.length).toBe(3);
			expect(result[0].type).toBe("heading");
			expect(result[1].type).toBe("paragraph");
			expect(result[2].type).toBe("bulletList");
		});

		it("should handle empty lines", () => {
			const text = "Text\n\nMore text";
			const result = parseMarkdownToNodes(text);
			expect(result.length).toBe(2); // paragraph, paragraph (empty line is just a separator)
		});

		it("should parse paragraphs with inline formatting", () => {
			const text = "This is **bold** and *italic* text";
			const result = parseMarkdownToNodes(text);
			expect(result).toMatchObject([
				{
					type: "paragraph",
					content: expect.arrayContaining([
						expect.objectContaining({ type: "text" }),
					]),
				},
			]);
		});

		it("should handle code block without language", () => {
			const text = "```\ncode without language\n```";
			const result = parseMarkdownToNodes(text);
			expect(result).toMatchObject([
				{
					type: "codeBlock",
					attrs: { language: "plaintext" },
				},
			]);
		});

		it("should handle multiple list types", () => {
			const text = "- Bullet 1\n- Bullet 2\n\n1. Ordered 1\n2. Ordered 2";
			const result = parseMarkdownToNodes(text);
			expect(result.length).toBe(2); // bulletList, orderedList (empty line is just a separator)
			expect(result[0].type).toBe("bulletList");
			expect(result[1].type).toBe("orderedList");
		});
	});
});
