import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
	detectBracketPattern,
	detectTagPattern,
	migrateBracketsToMarks,
} from "../legacy-link-migrator";

describe("legacy-link-migrator", () => {
	describe("migrateBracketsToMarks", () => {
		it("should convert [bracket] syntax to unilink mark", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "See [Page Title] for more info",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			expect(result.content?.[0]?.content).toHaveLength(3);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "text",
				text: "See ",
			});
			expect(result.content?.[0]?.content?.[1]).toMatchObject({
				type: "text",
				text: "Page Title",
				marks: [
					{
						type: "unilink",
						attrs: expect.objectContaining({
							variant: "bracket",
							raw: "Page Title",
							text: "Page Title",
							key: "page title",
							href: "#",
							state: "pending",
							created: false,
						}),
					},
				],
			});
			expect(result.content?.[0]?.content?.[2]).toEqual({
				type: "text",
				text: " for more info",
			});
		});

		it("should convert #tag syntax to unilink mark", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "This is #important note",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			// Expected: "This is", " ", "important", " note"
			expect(result.content?.[0]?.content).toHaveLength(4);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "text",
				text: "This is",
			});
			expect(result.content?.[0]?.content?.[1]).toEqual({
				type: "text",
				text: " ",
			});
			expect(result.content?.[0]?.content?.[2]).toMatchObject({
				type: "text",
				text: "important",
				marks: [
					{
						type: "unilink",
						attrs: expect.objectContaining({
							variant: "tag",
							raw: "important",
							text: "important",
							key: "important",
							href: "#",
							state: "pending",
							created: false,
						}),
					},
				],
			});
			expect(result.content?.[0]?.content?.[3]).toEqual({
				type: "text",
				text: " note",
			});
		});

		it("should handle external URL in [bracket] syntax", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Visit [https://example.com] for details",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			expect(result.content?.[0]?.content?.[1]).toMatchObject({
				type: "text",
				text: "https://example.com",
				marks: [
					{
						type: "unilink",
						attrs: expect.objectContaining({
							variant: "bracket",
							href: "https://example.com",
							external: true,
							exists: true,
							state: "exists",
						}),
					},
				],
			});
		});

		it("should skip text nodes with existing unilink marks", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Already marked",
								marks: [
									{
										type: "unilink",
										attrs: {
											variant: "bracket",
											text: "Already marked",
										},
									},
								],
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			expect(result.content?.[0]?.content).toHaveLength(1);
			expect(result.content?.[0]?.content?.[0]).toEqual(
				doc.content?.[0]?.content?.[0],
			);
		});

		it("should handle multiple [brackets] in one text node", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "See [Page A] and [Page B] for info",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			expect(result.content?.[0]?.content).toHaveLength(5);
			expect(result.content?.[0]?.content?.[0]?.text).toBe("See ");
			expect(result.content?.[0]?.content?.[1]?.text).toBe("Page A");
			expect(result.content?.[0]?.content?.[2]?.text).toBe(" and ");
			expect(result.content?.[0]?.content?.[3]?.text).toBe("Page B");
			expect(result.content?.[0]?.content?.[4]?.text).toBe(" for info");
		});

		it("should handle multiple #tags in one text node", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Tags: #first #second #third",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			// "Tags: ", " ", "first", " ", "second", " ", "third"
			expect(result.content?.[0]?.content?.length).toBeGreaterThanOrEqual(7);

			// Find tag nodes
			const tagNodes = result.content?.[0]?.content?.filter(
				(node) => node.marks?.[0]?.type === "unilink",
			);
			expect(tagNodes).toHaveLength(3);
		});

		it("should preserve whitespace before #tag", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Text #tag here",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			expect(result.content?.[0]?.content).toHaveLength(4);
			expect(result.content?.[0]?.content?.[0]?.text).toBe("Text");
			expect(result.content?.[0]?.content?.[1]?.text).toBe(" ");
			expect(result.content?.[0]?.content?.[2]?.text).toBe("tag");
			expect(result.content?.[0]?.content?.[3]?.text).toBe(" here");
		});

		it("should handle mixed [bracket] and #tag syntax", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "See [Page] with #tag notation",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			const unilinkNodes = result.content?.[0]?.content?.filter(
				(node) => node.marks?.[0]?.type === "unilink",
			);
			expect(unilinkNodes).toHaveLength(2);
			expect(unilinkNodes?.[0]?.marks?.[0]?.attrs?.variant).toBe("bracket");
			expect(unilinkNodes?.[1]?.marks?.[0]?.attrs?.variant).toBe("tag");
		});

		it("should return original node if no patterns found", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Plain text without patterns",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			expect(result.content?.[0]?.content).toHaveLength(1);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "text",
				text: "Plain text without patterns",
			});
		});

		it("should handle nested content structures", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Before",
							},
						],
					},
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "See [Page] here",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			expect(result.content).toHaveLength(2);
			expect(result.content?.[0]?.content).toHaveLength(1);
			expect(result.content?.[1]?.content?.length).toBeGreaterThan(1);
		});

		it("should handle #tag at start of text", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "#important note here",
							},
						],
					},
				],
			};

			const result = migrateBracketsToMarks(doc);

			expect(result.content?.[0]?.content?.[0]).toMatchObject({
				type: "text",
				text: "important",
				marks: [
					{
						type: "unilink",
						attrs: expect.objectContaining({
							variant: "tag",
						}),
					},
				],
			});
		});

		it("should handle empty document", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [],
			};

			const result = migrateBracketsToMarks(doc);

			expect(result).toEqual({
				type: "doc",
				content: [],
			});
		});
	});

	describe("detectBracketPattern", () => {
		it("should detect single [bracket] pattern", () => {
			const text = "See [Page Title] for more";
			const matches = detectBracketPattern(text);

			expect(matches).toHaveLength(1);
			expect(matches[0]).toEqual({
				content: "Page Title",
				start: 4,
				end: 16,
				isExternal: false,
			});
		});

		it("should detect multiple [bracket] patterns", () => {
			const text = "[First] and [Second] pages";
			const matches = detectBracketPattern(text);

			expect(matches).toHaveLength(2);
			expect(matches[0].content).toBe("First");
			expect(matches[1].content).toBe("Second");
		});

		it("should detect external URL in [bracket]", () => {
			const text = "Visit [https://example.com] site";
			const matches = detectBracketPattern(text);

			expect(matches).toHaveLength(1);
			expect(matches[0]).toEqual({
				content: "https://example.com",
				start: 6,
				end: 27,
				isExternal: true,
			});
		});

		it("should return empty array if no patterns found", () => {
			const text = "No brackets here";
			const matches = detectBracketPattern(text);

			expect(matches).toEqual([]);
		});
	});

	describe("detectTagPattern", () => {
		it("should detect single #tag pattern", () => {
			const text = "This is #important note";
			const matches = detectTagPattern(text);

			expect(matches).toHaveLength(1);
			expect(matches[0]).toEqual({
				content: "important",
				start: 8,
				end: 18,
				prefix: " ",
			});
		});

		it("should detect multiple #tag patterns", () => {
			const text = "Tags: #first #second #third";
			const matches = detectTagPattern(text);

			expect(matches).toHaveLength(3);
			expect(matches[0].content).toBe("first");
			expect(matches[1].content).toBe("second");
			expect(matches[2].content).toBe("third");
		});

		it("should detect #tag at start of text", () => {
			const text = "#important note";
			const matches = detectTagPattern(text);

			expect(matches).toHaveLength(1);
			expect(matches[0]).toEqual({
				content: "important",
				start: 0,
				end: 10,
				prefix: "",
			});
		});

		it("should return empty array if no patterns found", () => {
			const text = "No tags here";
			const matches = detectTagPattern(text);

			expect(matches).toEqual([]);
		});

		it("should handle tags with various characters", () => {
			const text = "Tags: #tag-name #tag_name #tag123";
			const matches = detectTagPattern(text);

			expect(matches).toHaveLength(3);
			expect(matches[0].content).toBe("tag-name");
			expect(matches[1].content).toBe("tag_name");
			expect(matches[2].content).toBe("tag123");
		});
	});
});
