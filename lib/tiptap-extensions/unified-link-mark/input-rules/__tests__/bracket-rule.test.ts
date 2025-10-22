/**
 * bracket-rule.ts のユニットテスト
 * bracket input rule の動作をテスト
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setupJSDOMEnvironment } from "@/lib/__tests__/helpers";
import { PATTERNS } from "../../config";
import { createBracketInputRule } from "../bracket-rule";

// Setup jsdom environment for this test
setupJSDOMEnvironment();

describe("createBracketInputRule", () => {
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
		it("should match bracket notation correctly", () => {
			const testCases = [
				{ input: "[Test Page]", shouldMatch: true, expected: "Test Page" },
				{
					input: "[日本語ページ]",
					shouldMatch: true,
					expected: "日本語ページ",
				},
				{
					input: "[Multi Word Page]",
					shouldMatch: true,
					expected: "Multi Word Page",
				},
				{ input: "[123 Numbers]", shouldMatch: true, expected: "123 Numbers" },
				{ input: "[Unclosed bracket", shouldMatch: false },
				{ input: "No brackets", shouldMatch: false },
				{ input: "[]", shouldMatch: false },
			];

			for (const { input, shouldMatch, expected } of testCases) {
				const match = PATTERNS.bracket.exec(input);

				if (shouldMatch) {
					expect(match).not.toBeNull();
					expect(match?.[1]).toBe(expected);
				} else {
					expect(match).toBeNull();
				}
			}
		});
	});

	describe("Input rule creation", () => {
		it("should create an InputRule instance", () => {
			const rule = createBracketInputRule(
				mockContext as { editor: Editor; name: string },
			);
			expect(rule).toBeDefined();
			expect(rule.find).toBe(PATTERNS.bracket);
			expect(typeof rule.handler).toBe("function");
		});
	});

	describe("Pattern validation", () => {
		it("should match valid bracket patterns", () => {
			const validPatterns = [
				"Hello [World]",
				"This is [a test]",
				"[Simple]",
				"Multiple [words] and [phrases]",
				"[https://example.com]",
				"[файл.txt]", // Cyrillic
				"[测试页面]", // Chinese
			];

			for (const pattern of validPatterns) {
				const match = PATTERNS.bracket.exec(pattern);
				expect(match).not.toBeNull();
			}
		});

		it("should not match invalid bracket patterns", () => {
			const invalidPatterns = [
				"[unclosed",
				"closed]",
				"[]", // empty brackets - correctly fails
				"normal text",
				"[]empty",
			];

			for (const pattern of invalidPatterns) {
				const match = PATTERNS.bracket.exec(pattern);
				expect(match).toBeNull();
			}
		});
	});

	describe("External URL detection", () => {
		it("should correctly identify external URLs", () => {
			const externalUrls = [
				"https://example.com",
				"http://test.org",
				"https://github.com/user/repo",
				"http://localhost:3000",
			];

			for (const url of externalUrls) {
				const isExternal = PATTERNS.externalUrl.test(url);
				expect(isExternal).toBe(true);
			}
		});

		it("should not identify internal links as external", () => {
			const internalLinks = [
				"Page Name",
				"Another Page",
				"file.txt",
				"mailto:test@example.com",
				"ftp://example.com",
				"javascript:alert('test')",
			];

			for (const link of internalLinks) {
				const isExternal = PATTERNS.externalUrl.test(link);
				expect(isExternal).toBe(false);
			}
		});
	});

	describe("Configuration", () => {
		it("should use correct regex pattern", () => {
			// Test the pattern directly
			// Pattern: /\[([^\[\]]+)\]/
			// No lookahead - simpler and more flexible
			expect(PATTERNS.bracket.source).toContain("[^[\\]]+");
			expect(PATTERNS.bracket.global).toBe(false);
			expect(PATTERNS.bracket.multiline).toBe(false);
		});

		it("should handle pattern edge cases", () => {
			const edgeCases = [
				{ text: "[a]", shouldMatch: true, expected: "a" },
				{ text: "[1]", shouldMatch: true, expected: "1" },
				{ text: "[!@#$%^&*()]", shouldMatch: true, expected: "!@#$%^&*()" },
				{ text: "[спецсимволы]", shouldMatch: true, expected: "спецсимволы" },
				{ text: "[ ]", shouldMatch: true, expected: " " }, // space is actually matched
				{ text: "[  ]", shouldMatch: true, expected: "  " }, // multiple spaces are matched
			];

			for (const { text, shouldMatch, expected } of edgeCases) {
				const match = PATTERNS.bracket.exec(text);
				if (shouldMatch) {
					expect(match).not.toBeNull();
					expect(match?.[1]).toBe(expected);
				} else {
					expect(match).toBeNull();
				}
			}
		});
	});

	describe("Input rule behavior", () => {
		it("should create rule with correct properties", () => {
			const rule = createBracketInputRule(
				mockContext as { editor: Editor; name: string },
			);

			expect(rule.find).toBe(PATTERNS.bracket);
			expect(typeof rule.handler).toBe("function");
		});

		it("should handle context correctly", () => {
			const context = { editor, name: "testMark" };
			const rule = createBracketInputRule(context);

			expect(rule).toBeDefined();
			expect(typeof rule.handler).toBe("function");
		});
	});
});
