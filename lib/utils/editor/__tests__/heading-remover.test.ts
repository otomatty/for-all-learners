import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { hasH1Headings, removeH1Headings } from "../heading-remover";

describe("heading-remover", () => {
	describe("removeH1Headings", () => {
		it("should convert H1 headings to paragraphs", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 1 },
						content: [{ type: "text", text: "Main Title" }],
					},
					{
						type: "paragraph",
						content: [{ type: "text", text: "Some content" }],
					},
				],
			};

			const result = removeH1Headings(doc);

			expect(result.content).toHaveLength(2);
			expect(result.content?.[0].type).toBe("paragraph");
			expect(result.content?.[0].content).toEqual([
				{ type: "text", text: "Main Title" },
			]);
		});

		it("should preserve H2-H6 headings", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 2 },
						content: [{ type: "text", text: "H2" }],
					},
					{
						type: "heading",
						attrs: { level: 3 },
						content: [{ type: "text", text: "H3" }],
					},
					{
						type: "heading",
						attrs: { level: 4 },
						content: [{ type: "text", text: "H4" }],
					},
				],
			};

			const result = removeH1Headings(doc);

			expect(result.content).toHaveLength(3);
			expect(result.content?.[0].type).toBe("heading");
			expect(
				(result.content?.[0] as JSONContent & { attrs?: { level: number } })
					.attrs?.level,
			).toBe(2);
			expect(result.content?.[1].type).toBe("heading");
			expect(
				(result.content?.[1] as JSONContent & { attrs?: { level: number } })
					.attrs?.level,
			).toBe(3);
			expect(result.content?.[2].type).toBe("heading");
			expect(
				(result.content?.[2] as JSONContent & { attrs?: { level: number } })
					.attrs?.level,
			).toBe(4);
		});

		it("should handle headings without level attribute as H1", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						content: [{ type: "text", text: "No level" }],
					},
				],
			};

			const result = removeH1Headings(doc);

			expect(result.content?.[0].type).toBe("paragraph");
		});

		it("should preserve heading content with marks", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 1 },
						content: [
							{ type: "text", text: "Bold ", marks: [{ type: "bold" }] },
							{ type: "text", text: "Title" },
						],
					},
				],
			};

			const result = removeH1Headings(doc);

			expect(result.content?.[0].type).toBe("paragraph");
			expect(result.content?.[0].content).toEqual([
				{ type: "text", text: "Bold ", marks: [{ type: "bold" }] },
				{ type: "text", text: "Title" },
			]);
		});

		it("should handle nested structures", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "blockquote",
						content: [
							{
								type: "heading",
								attrs: { level: 1 },
								content: [{ type: "text", text: "Quoted H1" }],
							},
						],
					},
				],
			};

			const result = removeH1Headings(doc);

			const blockquote = result.content?.[0];
			expect(blockquote?.type).toBe("blockquote");
			expect(blockquote?.content?.[0].type).toBe("paragraph");
			expect(blockquote?.content?.[0].content).toEqual([
				{ type: "text", text: "Quoted H1" },
			]);
		});

		it("should handle empty document", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [],
			};

			const result = removeH1Headings(doc);

			expect(result.content).toEqual([]);
		});

		it("should handle document without content", () => {
			const doc: JSONContent = {
				type: "doc",
			};

			const result = removeH1Headings(doc);

			expect(result.content).toBeUndefined();
		});

		it("should convert multiple H1 headings", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 1 },
						content: [{ type: "text", text: "First H1" }],
					},
					{
						type: "paragraph",
						content: [{ type: "text", text: "Content" }],
					},
					{
						type: "heading",
						attrs: { level: 1 },
						content: [{ type: "text", text: "Second H1" }],
					},
				],
			};

			const result = removeH1Headings(doc);

			expect(result.content?.[0].type).toBe("paragraph");
			expect(result.content?.[1].type).toBe("paragraph");
			expect(result.content?.[2].type).toBe("paragraph");
		});
	});

	describe("hasH1Headings", () => {
		it("should return true for documents with H1 headings", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 1 },
						content: [{ type: "text", text: "Title" }],
					},
				],
			};

			expect(hasH1Headings(doc)).toBe(true);
		});

		it("should return false for documents without H1 headings", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 2 },
						content: [{ type: "text", text: "Subtitle" }],
					},
					{
						type: "paragraph",
						content: [{ type: "text", text: "Content" }],
					},
				],
			};

			expect(hasH1Headings(doc)).toBe(false);
		});

		it("should return true for headings without level attribute", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						content: [{ type: "text", text: "No level" }],
					},
				],
			};

			expect(hasH1Headings(doc)).toBe(true);
		});

		it("should detect H1 in nested structures", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "blockquote",
						content: [
							{
								type: "heading",
								attrs: { level: 1 },
								content: [{ type: "text", text: "Nested H1" }],
							},
						],
					},
				],
			};

			expect(hasH1Headings(doc)).toBe(true);
		});

		it("should return false for empty document", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [],
			};

			expect(hasH1Headings(doc)).toBe(false);
		});

		it("should return false for document without content", () => {
			const doc: JSONContent = {
				type: "doc",
			};

			expect(hasH1Headings(doc)).toBe(false);
		});

		it("should handle multiple H1 headings", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 2 },
						content: [{ type: "text", text: "H2" }],
					},
					{
						type: "heading",
						attrs: { level: 1 },
						content: [{ type: "text", text: "H1" }],
					},
				],
			};

			expect(hasH1Headings(doc)).toBe(true);
		});
	});
});
