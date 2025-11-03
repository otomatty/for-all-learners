/**
 * Tests for buildPrompt and buildPromptFromGeminiContents functions
 *
 * DEPENDENCY MAP:
 *
 * Parents (Tests for):
 *   └─ lib/llm/prompt-builder.ts
 *
 * Dependencies (Mocks):
 *   └─ なし (ピュア関数)
 *
 * Related Files:
 *   ├─ Spec: ../prompt-builder.spec.md (to be created)
 *   ├─ Implementation: ../prompt-builder.ts
 *   └─ Plan: docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md
 */

import { describe, expect, test } from "vitest";
import {
	buildPrompt,
	buildPromptFromGeminiContents,
	type PromptPart,
} from "../prompt-builder";

describe("buildPrompt", () => {
	// ========================================
	// TC-001: 文字列配列からプロンプト生成
	// ========================================
	describe("TC-001: Build prompt from string array", () => {
		test("should combine simple strings with double newlines", () => {
			// Arrange
			const parts: PromptPart[] = ["System prompt", "User input"];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("System prompt\n\nUser input");
		});

		test("should handle single string", () => {
			// Arrange
			const parts: PromptPart[] = ["Single prompt"];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("Single prompt");
		});

		test("should handle multiple strings", () => {
			// Arrange
			const parts: PromptPart[] = ["First", "Second", "Third"];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("First\n\nSecond\n\nThird");
		});

		test("should preserve empty strings (but filter them out)", () => {
			// Arrange
			const parts: PromptPart[] = ["First", "", "Third"];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("First\n\nThird");
		});

		test("should handle strings with whitespace only (filter them out)", () => {
			// Arrange
			const parts: PromptPart[] = ["First", "   ", "\n\n", "Third"];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("First\n\nThird");
		});
	});

	// ========================================
	// TC-002: オブジェクト配列からプロンプト生成
	// ========================================
	describe("TC-002: Build prompt from object array", () => {
		test("should extract text from objects with text property", () => {
			// Arrange
			const parts: PromptPart[] = [{ text: "Hello" }, { text: "World" }];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("Hello\n\nWorld");
		});

		test("should handle mixed string and text objects", () => {
			// Arrange
			const parts: PromptPart[] = ["System", { text: "User" }, "Additional"];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("System\n\nUser\n\nAdditional");
		});

		test("should handle empty text objects (filter them out)", () => {
			// Arrange
			const parts: PromptPart[] = [
				{ text: "First" },
				{ text: "" },
				{ text: "   " },
				{ text: "Last" },
			];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("First\n\nLast");
		});
	});

	// ========================================
	// TC-003: 混在配列からプロンプト生成
	// ========================================
	describe("TC-003: Build prompt from mixed array", () => {
		test("should handle Gemini-style nested parts", () => {
			// Arrange
			const parts: PromptPart[] = [
				{ parts: [{ text: "Part 1" }, { text: "Part 2" }] },
			];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("Part 1 Part 2");
		});

		test("should handle mixed string, text object, and nested parts", () => {
			// Arrange
			const parts: PromptPart[] = [
				"System prompt",
				{ text: "User message" },
				{ parts: [{ text: "Nested" }, { text: "Parts" }] },
			];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("System prompt\n\nUser message\n\nNested Parts");
		});

		test("should handle complex nested structure", () => {
			// Arrange
			const parts: PromptPart[] = [
				{ parts: [{ text: "A" }, { text: "B" }] },
				{ parts: [{ text: "C" }] },
				"D",
			];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("A B\n\nC\n\nD");
		});

		test("should handle unknown object types by stringifying", () => {
			// Arrange
			const parts: PromptPart[] = [
				"Text",
				// biome-ignore lint/suspicious/noExplicitAny: Testing unknown type
				{ unknown: "property" } as any,
			];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toContain("Text");
			expect(result).toContain('{"unknown":"property"}');
		});
	});

	// ========================================
	// TC-004: 空配列の処理
	// ========================================
	describe("TC-004: Empty array handling", () => {
		test("should return empty string for empty array", () => {
			// Arrange
			const parts: PromptPart[] = [];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("");
		});

		test("should return empty string for null/undefined (edge case)", () => {
			// Arrange
			// biome-ignore lint/suspicious/noExplicitAny: Testing edge case
			const parts: PromptPart[] = null as any;

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("");
		});

		test("should filter out all empty strings and return empty string", () => {
			// Arrange
			const parts: PromptPart[] = ["", "   ", "\n\n", ""];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("");
		});

		test("should filter out empty text objects", () => {
			// Arrange
			const parts: PromptPart[] = [
				{ text: "" },
				{ text: "   " },
				{ text: "\n" },
			];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("");
		});

		test("should filter out empty nested parts", () => {
			// Arrange
			const parts: PromptPart[] = [{ parts: [{ text: "" }, { text: "   " }] }];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("");
		});
	});

	// ========================================
	// Additional edge cases
	// ========================================
	describe("Additional edge cases", () => {
		test("should handle newlines within strings", () => {
			// Arrange
			const parts: PromptPart[] = ["Line 1\nLine 2", "Line 3"];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("Line 1\nLine 2\n\nLine 3");
		});

		test("should handle very long strings", () => {
			// Arrange
			const longString = "A".repeat(1000);
			const parts: PromptPart[] = [longString];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe(longString);
			expect(result.length).toBe(1000);
		});

		test("should handle special characters", () => {
			// Arrange
			const parts: PromptPart[] = [
				"日本語",
				"🚀 Emoji",
				"<script>alert('xss')</script>",
			];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe(
				"日本語\n\n🚀 Emoji\n\n<script>alert('xss')</script>",
			);
		});

		test("should handle nested parts with empty arrays", () => {
			// Arrange
			const parts: PromptPart[] = [{ parts: [] }, "Text"];

			// Act
			const result = buildPrompt(parts);

			// Assert
			expect(result).toBe("Text");
		});
	});
});

describe("buildPromptFromGeminiContents", () => {
	describe("TC-001: Basic Gemini contents conversion", () => {
		test("should extract text from Gemini contents array", () => {
			// Arrange
			const contents = [
				{
					role: "user",
					parts: [{ text: "Hello" }, { text: "World" }],
				},
			];

			// Act
			const result = buildPromptFromGeminiContents(contents);

			// Assert
			expect(result).toBe("Hello World");
		});

		test("should handle multiple contents", () => {
			// Arrange
			const contents = [
				{
					role: "user",
					parts: [{ text: "First" }],
				},
				{
					role: "assistant",
					parts: [{ text: "Second" }],
				},
			];

			// Act
			const result = buildPromptFromGeminiContents(contents);

			// Assert
			expect(result).toBe("First\n\nSecond");
		});

		test("should handle contents without role", () => {
			// Arrange
			const contents = [
				{
					parts: [{ text: "Text" }],
				},
			];

			// Act
			const result = buildPromptFromGeminiContents(contents);

			// Assert
			expect(result).toBe("Text");
		});
	});

	describe("TC-002: Empty contents handling", () => {
		test("should return empty string for empty array", () => {
			// Arrange
			const contents: { role?: string; parts: { text: string }[] }[] = [];

			// Act
			const result = buildPromptFromGeminiContents(contents);

			// Assert
			expect(result).toBe("");
		});

		test("should filter out empty parts", () => {
			// Arrange
			const contents = [
				{
					role: "user",
					parts: [{ text: "First" }, { text: "" }, { text: "Last" }],
				},
			];

			// Act
			const result = buildPromptFromGeminiContents(contents);

			// Assert
			// Empty string parts are joined with space, so "First  Last" is expected
			expect(result).toBe("First  Last");
		});

		test("should filter out contents with empty parts array", () => {
			// Arrange
			const contents = [
				{
					role: "user",
					parts: [],
				},
				{
					role: "assistant",
					parts: [{ text: "Text" }],
				},
			];

			// Act
			const result = buildPromptFromGeminiContents(contents);

			// Assert
			expect(result).toBe("Text");
		});
	});

	describe("TC-003: Edge cases", () => {
		test("should handle null/undefined contents", () => {
			// Arrange
			// biome-ignore lint/suspicious/noExplicitAny: Testing edge case
			const contents: any = null;

			// Act
			const result = buildPromptFromGeminiContents(contents);

			// Assert
			expect(result).toBe("");
		});

		test("should handle whitespace-only parts", () => {
			// Arrange
			const contents = [
				{
					role: "user",
					parts: [{ text: "   " }, { text: "\n\n" }],
				},
			];

			// Act
			const result = buildPromptFromGeminiContents(contents);

			// Assert
			expect(result).toBe("");
		});
	});
});
