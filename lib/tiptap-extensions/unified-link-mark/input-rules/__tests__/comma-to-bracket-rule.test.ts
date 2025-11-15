/**
 * comma-to-bracket-rule.ts のユニットテスト
 * comma-to-bracket input rule の動作をテスト
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCommaToBracketInputRule } from "../comma-to-bracket-rule";

// Note: happy-dom environment is already set up in vitest.config.mts

describe("createCommaToBracketInputRule", () => {
	let editor: Editor;
	const mockContext = { editor: null as Editor | null, name: "unifiedLink" };

	beforeEach(() => {
		editor = new Editor({
			extensions: [StarterKit],
			content: "",
		});

		mockContext.editor = editor;
	});

	afterEach(() => {
		editor?.destroy();
	});

	describe("Pattern matching", () => {
		it("should match three consecutive commas", () => {
			// Test the regex pattern directly
			const pattern = /(?<!,),,,$/;
			const testCases = [
				{ input: ",,,", shouldMatch: true },
				{ input: "text,,,", shouldMatch: true },
				{ input: ",,", shouldMatch: false }, // Two commas
				{ input: ",,,,", shouldMatch: false }, // Four commas (negative lookbehind prevents match)
				{ input: ",,,text", shouldMatch: false }, // Not at end
				{ input: "normal text", shouldMatch: false },
			];

			for (const { input, shouldMatch } of testCases) {
				const match = pattern.exec(input);
				if (shouldMatch) {
					expect(match).not.toBeNull();
				} else {
					expect(match).toBeNull();
				}
			}
		});
	});

	describe("Input rule creation", () => {
		it("should create an InputRule instance", () => {
			const rule = createCommaToBracketInputRule(
				mockContext as { editor: Editor; name: string },
			);
			expect(rule).toBeDefined();
			expect(rule.find).toBeDefined();
			expect(typeof rule.handler).toBe("function");
		});
	});

	// Note: InputRule behavior tests require the rule to be registered with the editor
	// These tests verify the rule creation and pattern matching only
	// Integration tests should be done in a separate test file with the full extension setup
});
