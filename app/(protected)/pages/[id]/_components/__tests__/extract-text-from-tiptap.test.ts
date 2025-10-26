/**
 * Tests for extractTextFromTiptap utility
 */

import { describe, expect, test } from "vitest";
import { extractTextFromTiptap } from "../extract-text-from-tiptap";
import type { JSONContent } from "@tiptap/core";

describe("extractTextFromTiptap", () => {
	test("should extract text from simple paragraph", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Hello, World!",
						},
					],
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("Hello, World!");
	});

	test("should extract text from multiple paragraphs", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "First paragraph.",
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Second paragraph.",
						},
					],
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("First paragraph. Second paragraph.");
	});

	test("should handle nested content", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Before ",
						},
						{
							type: "text",
							text: "bold",
							marks: [{ type: "bold" }],
						},
						{
							type: "text",
							text: " after.",
						},
					],
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("Before bold after.");
	});

	test("should return empty string for empty document", () => {
		const content: JSONContent = {
			type: "doc",
			content: [],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("");
	});

	test("should handle document without content", () => {
		const content: JSONContent = {
			type: "doc",
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("");
	});

	test("should handle nodes without text", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("");
	});

	test("should extract text with links", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Check out ",
						},
						{
							type: "text",
							text: "React",
							marks: [
								{
									type: "unilink",
									attrs: {
										key: "react",
										text: "React",
									},
								},
							],
						},
						{
							type: "text",
							text: " for details.",
						},
					],
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("Check out React for details.");
	});

	test("should handle headings", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "heading",
					attrs: { level: 1 },
					content: [
						{
							type: "text",
							text: "Main Title",
						},
					],
				},
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "Content below.",
						},
					],
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("Main Title Content below.");
	});

	test("should handle bullet lists", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "bulletList",
					content: [
						{
							type: "listItem",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Item 1",
										},
									],
								},
							],
						},
						{
							type: "listItem",
							content: [
								{
									type: "paragraph",
									content: [
										{
											type: "text",
											text: "Item 2",
										},
									],
								},
							],
						},
					],
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("Item 1 Item 2");
	});

	test("should handle code blocks", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "codeBlock",
					attrs: { language: "javascript" },
					content: [
						{
							type: "text",
							text: 'console.log("Hello");',
						},
					],
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe('console.log("Hello");');
	});

	test("should limit text length to 200 characters", () => {
		const longText = "a".repeat(300);
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: longText,
						},
					],
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result.length).toBe(203); // 200 + "..."
		expect(result.endsWith("...")).toBe(true);
	});

	test("should join multiple text segments with spaces", () => {
		const content: JSONContent = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "First",
						},
						{
							type: "text",
							text: "Second",
						},
						{
							type: "text",
							text: "Third",
						},
					],
				},
			],
		};

		const result = extractTextFromTiptap(content);
		expect(result).toBe("First Second Third");
	});
});
