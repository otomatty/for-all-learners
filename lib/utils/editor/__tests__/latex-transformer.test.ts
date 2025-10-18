import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
	transformDollarInDoc,
	transformLatexInTextNode,
} from "../latex-transformer";

describe("latex-transformer", () => {
	describe("transformDollarInDoc", () => {
		it("should convert single LaTeX expression to latexInlineNode", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "The formula $E=mc^2$ is famous",
							},
						],
					},
				],
			};

			const result = transformDollarInDoc(doc);

			expect(result.content?.[0]?.content).toHaveLength(3);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "text",
				text: "The formula ",
			});
			expect(result.content?.[0]?.content?.[1]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "E=mc^2" },
			});
			expect(result.content?.[0]?.content?.[2]).toEqual({
				type: "text",
				text: " is famous",
			});
		});

		it("should convert multiple LaTeX expressions", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "First $x^2$ and second $y^2$ formulas",
							},
						],
					},
				],
			};

			const result = transformDollarInDoc(doc);

			expect(result.content?.[0]?.content).toHaveLength(5);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "text",
				text: "First ",
			});
			expect(result.content?.[0]?.content?.[1]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "x^2" },
			});
			expect(result.content?.[0]?.content?.[2]).toEqual({
				type: "text",
				text: " and second ",
			});
			expect(result.content?.[0]?.content?.[3]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "y^2" },
			});
			expect(result.content?.[0]?.content?.[4]).toEqual({
				type: "text",
				text: " formulas",
			});
		});

		it("should preserve marks on text nodes", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Bold $x^2$ text",
								marks: [{ type: "bold" }],
							},
						],
					},
				],
			};

			const result = transformDollarInDoc(doc);

			expect(result.content?.[0]?.content).toHaveLength(3);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "text",
				text: "Bold ",
				marks: [{ type: "bold" }],
			});
			expect(result.content?.[0]?.content?.[1]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "x^2" },
			});
			expect(result.content?.[0]?.content?.[2]).toEqual({
				type: "text",
				text: " text",
				marks: [{ type: "bold" }],
			});
		});

		it("should handle nested nodes correctly", () => {
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
								text: "Formula $a+b$ here",
							},
						],
					},
				],
			};

			const result = transformDollarInDoc(doc);

			expect(result.content).toHaveLength(2);
			expect(result.content?.[0]?.content).toHaveLength(1);
			expect(result.content?.[1]?.content).toHaveLength(3);
			expect(result.content?.[1]?.content?.[1]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "a+b" },
			});
		});

		it("should handle text without LaTeX expressions", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Plain text without formulas",
							},
						],
					},
				],
			};

			const result = transformDollarInDoc(doc);

			expect(result.content?.[0]?.content).toHaveLength(1);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "text",
				text: "Plain text without formulas",
			});
		});

		it("should handle empty document", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [],
			};

			const result = transformDollarInDoc(doc);

			expect(result).toEqual({
				type: "doc",
				content: [],
			});
		});

		it("should handle LaTeX at start of text", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "$E=mc^2$ is the formula",
							},
						],
					},
				],
			};

			const result = transformDollarInDoc(doc);

			expect(result.content?.[0]?.content).toHaveLength(2);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "E=mc^2" },
			});
			expect(result.content?.[0]?.content?.[1]).toEqual({
				type: "text",
				text: " is the formula",
			});
		});

		it("should handle LaTeX at end of text", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "The formula is $E=mc^2$",
							},
						],
					},
				],
			};

			const result = transformDollarInDoc(doc);

			expect(result.content?.[0]?.content).toHaveLength(2);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "text",
				text: "The formula is ",
			});
			expect(result.content?.[0]?.content?.[1]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "E=mc^2" },
			});
		});

		it("should handle consecutive LaTeX expressions", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "$x^2$$y^2$",
							},
						],
					},
				],
			};

			const result = transformDollarInDoc(doc);

			expect(result.content?.[0]?.content).toHaveLength(2);
			expect(result.content?.[0]?.content?.[0]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "x^2" },
			});
			expect(result.content?.[0]?.content?.[1]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "y^2" },
			});
		});

		it("should handle complex LaTeX expressions", () => {
			const doc: JSONContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [
							{
								type: "text",
								text: "Formula $\\frac{a}{b} + \\sqrt{c}$ is complex",
							},
						],
					},
				],
			};

			const result = transformDollarInDoc(doc);

			expect(result.content?.[0]?.content).toHaveLength(3);
			expect(result.content?.[0]?.content?.[1]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "\\frac{a}{b} + \\sqrt{c}" },
			});
		});
	});

	describe("transformLatexInTextNode", () => {
		const regex = /\$([^$]+)\$/g;

		it("should transform single LaTeX expression in text node", () => {
			const textNode = {
				type: "text" as const,
				text: "Formula $x^2$ here",
			};

			const result = transformLatexInTextNode(textNode, regex);

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual({ type: "text", text: "Formula " });
			expect(result[1]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "x^2" },
			});
			expect(result[2]).toEqual({ type: "text", text: " here" });
		});

		it("should preserve marks in split text nodes", () => {
			const textNode = {
				type: "text" as const,
				text: "Bold $x^2$ text",
				marks: [{ type: "bold" }, { type: "italic" }],
			};

			const result = transformLatexInTextNode(textNode, regex);

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual({
				type: "text",
				text: "Bold ",
				marks: [{ type: "bold" }, { type: "italic" }],
			});
			expect(result[1]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "x^2" },
			});
			expect(result[2]).toEqual({
				type: "text",
				text: " text",
				marks: [{ type: "bold" }, { type: "italic" }],
			});
		});

		it("should return original node if no LaTeX found", () => {
			const textNode = {
				type: "text" as const,
				text: "No formula here",
			};

			const result = transformLatexInTextNode(textNode, regex);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(textNode);
		});

		it("should handle empty text", () => {
			const textNode = {
				type: "text" as const,
				text: "",
			};

			const result = transformLatexInTextNode(textNode, regex);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(textNode);
		});

		it("should handle text with only LaTeX", () => {
			const textNode = {
				type: "text" as const,
				text: "$x^2$",
			};

			const result = transformLatexInTextNode(textNode, regex);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				type: "latexInlineNode",
				attrs: { content: "x^2" },
			});
		});
	});
});
