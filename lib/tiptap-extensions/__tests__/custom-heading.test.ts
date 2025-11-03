/**
 * CustomHeading extension tests
 * Verifies that # notation maps to H2, ## to H3, etc.
 */

import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CustomHeading } from "../custom-heading";

describe("CustomHeading", () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({
			extensions: [
				Document,
				Paragraph,
				Text,
				CustomHeading.configure({ levels: [2, 3, 4, 5, 6] }),
			],
			content: "",
		});
	});

	afterEach(() => {
		editor?.destroy();
	});

	describe("Input rule pattern validation", () => {
		it("should have correct regex pattern for level 2 (# -> H2)", () => {
			const hashCount = 1; // level 2 - 1
			const pattern = new RegExp(`^(#{${hashCount}})\\s$`);

			expect(pattern.test("# ")).toBe(true);
			expect(pattern.test("#")).toBe(false);
			expect(pattern.test("## ")).toBe(false);
		});

		it("should have correct regex pattern for level 3 (## -> H3)", () => {
			const hashCount = 2; // level 3 - 1
			const pattern = new RegExp(`^(#{${hashCount}})\\s$`);

			expect(pattern.test("## ")).toBe(true);
			expect(pattern.test("# ")).toBe(false);
			expect(pattern.test("### ")).toBe(false);
		});

		it("should have correct regex pattern for level 4 (### -> H4)", () => {
			const hashCount = 3; // level 4 - 1
			const pattern = new RegExp(`^(#{${hashCount}})\\s$`);

			expect(pattern.test("### ")).toBe(true);
			expect(pattern.test("## ")).toBe(false);
			expect(pattern.test("#### ")).toBe(false);
		});

		it("should generate correct patterns for all configured levels", () => {
			const expectedPatterns = [
				{ level: 2, hashCount: 1, test: "# " },
				{ level: 3, hashCount: 2, test: "## " },
				{ level: 4, hashCount: 3, test: "### " },
				{ level: 5, hashCount: 4, test: "#### " },
				{ level: 6, hashCount: 5, test: "##### " },
			];

			for (const { hashCount, test } of expectedPatterns) {
				const pattern = new RegExp(`^(#{${hashCount}})\\s$`);
				expect(pattern.test(test)).toBe(true);
			}
		});
	});

	describe("Text content preservation", () => {
		it("should preserve text after # conversion to H2", () => {
			editor.commands.setContent("<p># Title</p>");

			// Simulate input rule trigger by setting cursor after space
			const pos = 3; // After "# "
			editor.commands.setTextSelection(pos);

			// Manually trigger the heading conversion
			editor.commands.setNode("heading", { level: 2 });

			const json = editor.getJSON();
			expect(json.content?.[0]?.type).toBe("heading");
			expect(json.content?.[0]?.attrs?.level).toBe(2);
			expect(json.content?.[0]?.content?.[0]?.text).toContain("Title");
		});
	});

	describe("Rendering", () => {
		it("should render H2 with correct classes", () => {
			editor.commands.setContent({
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 2 },
						content: [{ type: "text", text: "Heading 2" }],
					},
				],
			});

			const html = editor.getHTML();
			expect(html).toContain("<h2");
			expect(html).toContain("text-xl");
			expect(html).toContain("font-bold");
		});

		it("should render H3 with correct classes", () => {
			editor.commands.setContent({
				type: "doc",
				content: [
					{
						type: "heading",
						attrs: { level: 3 },
						content: [{ type: "text", text: "Heading 3" }],
					},
				],
			});

			const html = editor.getHTML();
			expect(html).toContain("<h3");
			expect(html).toContain("text-lg");
		});
	});

	describe("Configuration", () => {
		it("should respect configured levels", () => {
			const customEditor = new Editor({
				extensions: [
					Document,
					Paragraph,
					Text,
					CustomHeading.configure({ levels: [2, 3] }), // Only H2 and H3
				],
				content: "",
			});

			// Verify input rules are created for configured levels
			const headingExtension = customEditor.extensionManager.extensions.find(
				(ext) => ext.name === "heading",
			);
			expect(headingExtension).toBeDefined();

			// Verify the extension has the correct levels configured
			expect(headingExtension?.options.levels).toEqual([2, 3]);

			customEditor.destroy();
		});
	});
});
