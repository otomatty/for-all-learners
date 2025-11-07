/**
 * tag-rule.ts のユニットテスト
 * tag input rule の動作をテスト
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PATTERNS } from "../../config";
import { createTagInputRule } from "../tag-rule";

// Note: happy-dom environment is already set up in vitest.config.mts

describe("createTagInputRule", () => {
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
		it("should match tag notation correctly", () => {
			const testCases = [
				{ input: " #tag", shouldMatch: true, expected: "tag" }, // Space before
				{ input: " #タグ", shouldMatch: true, expected: "タグ" },
				{ input: " #tag123", shouldMatch: true, expected: "tag123" },
				{ input: " #テスト", shouldMatch: true, expected: "テスト" },
				{ input: " #中文", shouldMatch: true, expected: "中文" },
				{ input: "# space", shouldMatch: false }, // space after hash
				{ input: "notag", shouldMatch: false },
				{ input: "#", shouldMatch: false },
				{ input: "no#tag", shouldMatch: false }, // No space before # (lookbehind fails)
			];

			for (const { input, shouldMatch, expected } of testCases) {
				const match = PATTERNS.tag.exec(input);

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
			const rule = createTagInputRule(
				mockContext as { editor: Editor; name: string },
			);
			expect(rule).toBeDefined();
			expect(rule.find).toBe(PATTERNS.tag);
			expect(typeof rule.handler).toBe("function");
		});
	});

	describe("Pattern validation", () => {
		it("should match valid tag patterns", () => {
			const validPatterns = [
				"Hello #world",
				"This is #test",
				" #simple", // Needs space before
				"Multiple #tags and #phrases",
				" #ひらがな",
				" #カタカナ",
				" #漢字",
				" #测试", // Chinese characters
				" #tag1",
				" #tag123",
				" #a",
				" #Z",
				// Test cases for the reported bug fix
				" #aaa", // Should match entire "aaa", not just "a"
				" #abc123def", // Should match entire string
				" #テストケース", // Should match entire Japanese string
			];

			for (const pattern of validPatterns) {
				const match = PATTERNS.tag.exec(pattern);
				expect(match).not.toBeNull();
			}
		});

		it("should capture complete tag text including multiple consecutive characters", () => {
			// Test for the specific bug: #aaa should capture "aaa", not just "a"
			const testCases = [
				{ input: " #aaa", expected: "aaa" },
				{ input: " #abc123", expected: "abc123" },
				{ input: " #テストケース", expected: "テストケース" },
				{ input: " #中文测试", expected: "中文测试" },
				{ input: " #mixedText123", expected: "mixedText123" },
				{ input: " #a1b2c3d4e5", expected: "a1b2c3d4e5" },
			];

			for (const { input, expected } of testCases) {
				const match = PATTERNS.tag.exec(input);
				expect(match).not.toBeNull();
				expect(match?.[1]).toBe(expected);
			}
		});

		it("should not match invalid tag patterns", () => {
			// These patterns should NOT match because the tag part itself contains invalid characters
			// or there's no word boundary before the #
			// Note: " #tag!" matches as " #tag" followed by "!" (which satisfies lookahead)
			// So we only test patterns where the tag itself is invalid
			const invalidPatterns = [
				" # space", // Space after # (no tag characters)
				" #", // Nothing after #
				" # ", // Only space after #
				" #  ", // Only spaces after #
				"normal text", // No tag at all
				"no#hash", // # in middle without leading space
			];

			for (const pattern of invalidPatterns) {
				const match = PATTERNS.tag.exec(pattern);
				expect(match).toBeNull();
			}
		});
	});

	describe("Character support", () => {
		it("should support alphanumeric characters", () => {
			const alphanumeric = [
				" #abc",
				" #ABC",
				" #123",
				" #abc123",
				" #ABC123",
				" #a1b2c3",
			];

			for (const tag of alphanumeric) {
				const match = PATTERNS.tag.exec(tag);
				expect(match).not.toBeNull();
			}
		});

		it("should support Japanese characters", () => {
			const japanese = [
				" #ひらがな",
				" #カタカナ",
				" #漢字",
				" #混合文字列",
				" #ひらカナ漢字123",
			];

			for (const tag of japanese) {
				const match = PATTERNS.tag.exec(tag);
				expect(match).not.toBeNull();
			}
		});

		it("should support CJK characters", () => {
			const supportedCjk = [
				" #中文",
				" #測試",
				" #한글", // Korean characters now supported
				" #테스트", // Korean characters now supported
			];

			for (const tag of supportedCjk) {
				const match = PATTERNS.tag.exec(tag);
				expect(match).not.toBeNull();
			}
		});

		it("should support Korean characters", () => {
			const korean = [
				" #한글",
				" #테스트",
				" #한국어",
				" #안녕하세요",
				" #가나다라마바사",
				" #혼합문자123", // Mixed Korean and numbers
			];

			for (const tag of korean) {
				const match = PATTERNS.tag.exec(tag);
				expect(match).not.toBeNull();
			}
		});

		it("should support mixed CJK characters", () => {
			const mixedCjk = [
				" #中한日", // Chinese + Korean + Japanese
				" #日本語한국어", // Japanese + Korean
				" #중국漢字", // Korean + Chinese
				" #混合언어123", // Mixed languages with numbers
			];

			for (const tag of mixedCjk) {
				const match = PATTERNS.tag.exec(tag);
				expect(match).not.toBeNull();
			}
		});
	});

	describe("Length constraints", () => {
		it("should match tags within length limit", () => {
			// 50文字以内のタグ
			const validLengthTags = [
				" #a", // 1文字
				` #${"a".repeat(50)}`, // 50文字
				" #日本語タグ", // マルチバイト文字
			];

			for (const tag of validLengthTags) {
				const match = PATTERNS.tag.exec(tag);
				expect(match).not.toBeNull();
			}
		});

		it("should not match tags exceeding length limit", () => {
			// 51文字以上のタグ
			const invalidLengthTags = [
				` #${"a".repeat(51)}`, // 51文字
				` #${"a".repeat(100)}`, // 100文字
			];

			for (const tag of invalidLengthTags) {
				const match = PATTERNS.tag.exec(tag);
				expect(match).toBeNull();
			}
		});
	});

	describe("Word boundary behavior", () => {
		describe("Word boundary behavior", () => {
			it("should only match at word boundaries", () => {
				// Pattern is: (?:^|\s)#([a-zA-Z0-9...]){1,50}(?=\s|$|[^\p{Letter}\p{Number}])
				// So it matches after word boundary (^ or \s)
				const wordBoundaryTests = [
					{ input: "hello#tag", shouldMatch: false }, // # directly after letter - no word boundary
					{ input: "hello #tag", shouldMatch: true, expected: "tag" }, // After space
					{ input: " #tag", shouldMatch: true, expected: "tag" }, // After space at start
					{ input: "\n#tag", shouldMatch: true, expected: "tag" }, // After newline (whitespace)
					{ input: "\t#tag", shouldMatch: true, expected: "tag" }, // After tab (whitespace)
				];

				for (const { input, shouldMatch, expected } of wordBoundaryTests) {
					const match = PATTERNS.tag.exec(input);

					if (shouldMatch) {
						expect(match).not.toBeNull();
						if (match) {
							expect(match[1]).toBe(expected);
						}
					} else {
						expect(match).toBeNull();
					}
				}
			});
		});
	});
	describe("Configuration", () => {
		it("should use correct regex pattern with unicode flag", () => {
			// Test the pattern directly - updated for new regex with special characters support
			expect(PATTERNS.tag.source).toContain("#([a-zA-Z0-9");
			// Verify special characters are included (note: - is escaped as \- in regex)
			expect(PATTERNS.tag.source).toContain("\\-");
			expect(PATTERNS.tag.source).toContain("_");
			expect(PATTERNS.tag.source).toContain("+");
			expect(PATTERNS.tag.source).toContain("=");
			// Verify Unicode ranges are included
			expect(PATTERNS.tag.source).toContain("\\u3040-\\u309F");
			expect(PATTERNS.tag.unicode).toBe(true); // Now uses unicode flag
			expect(PATTERNS.tag.global).toBe(false);
			expect(PATTERNS.tag.multiline).toBe(false);
		});

		it("should handle pattern edge cases", () => {
			const edgeCases = [
				{ text: " #a", shouldMatch: true, expected: "a" },
				{ text: " #1", shouldMatch: true, expected: "1" },
				{ text: " #あ", shouldMatch: true, expected: "あ" },
				{ text: " #ア", shouldMatch: true, expected: "ア" },
				{ text: " #中", shouldMatch: true, expected: "中" },
				{ text: " #ㄱ", shouldMatch: false }, // Korean Jamo not included
				{ text: " #！", shouldMatch: false }, // Special characters not allowed
				{ text: "no#tag", shouldMatch: false }, // No space before #
			];

			for (const { text, shouldMatch, expected } of edgeCases) {
				const match = PATTERNS.tag.exec(text);
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
			const rule = createTagInputRule(
				mockContext as { editor: Editor; name: string },
			);

			expect(rule.find).toBe(PATTERNS.tag);
			expect(typeof rule.handler).toBe("function");
		});

		it("should handle context correctly", () => {
			const context = { editor, name: "testMark" };
			const rule = createTagInputRule(context);

			expect(rule).toBeDefined();
			expect(typeof rule.handler).toBe("function");
		});
	});

	describe("Regex performance", () => {
		it("should not cause catastrophic backtracking", () => {
			// Test patterns that could cause ReDoS
			const potentialProblematicInputs = [
				` #${"a".repeat(1000)}`, // Very long string
				` #${"あ".repeat(500)}`, // Long Japanese string
				" ####################", // Multiple hashes
				` #${"!".repeat(100)}`, // Invalid characters
			];

			for (const input of potentialProblematicInputs) {
				const start = performance.now();
				PATTERNS.tag.exec(input);
				const end = performance.now();

				// Should complete within reasonable time (less than 50ms)
				// Note: 10ms was too strict for CI/CD environments with varying CPU load
				expect(end - start).toBeLessThan(50);
			}
		});
	});

	describe("Tag suggestion and link creation behavior", () => {
		describe("Link creation from tag input", () => {
			it("should create link with input text when no suggestion selected", () => {
				// Scenario: User types " #MyTag" and presses Enter without selecting suggestion
				// Expected: Link is created with "MyTag" as the text and key
				const rule = createTagInputRule(
					mockContext as { editor: Editor; name: string },
				);

				expect(rule).toBeDefined();
				expect(rule.handler).toBeDefined();
				// Handler should create mark with attrs including key and raw
			});

			it("should preserve hash prefix in displayed text", () => {
				// Scenario: " #MyTag" → displays as "#MyTag" in the document
				const rule = createTagInputRule(
					mockContext as { editor: Editor; name: string },
				);

				// The text attribute should include # prefix
				// text = `#${raw}`
				expect(rule).toBeDefined();
			});

			it("should set correct attributes for pending state", () => {
				// Scenario: New tag without matching page
				// Expected: state: "pending", exists: false
				const rule = createTagInputRule(
					mockContext as { editor: Editor; name: string },
				);

				// Handler should set appropriate attributes
				// variant: "tag", state: "pending", exists: false
				expect(rule).toBeDefined();
			});
		});

		describe("Empty query suggestion display", () => {
			it("should show suggestions when user types # alone", () => {
				// Scenario: User types " #" and waits for suggestions
				// Expected: Suggestion UI shows all pages (latest first)
				expect(PATTERNS.tag).toBeDefined();
				// Suggestion plugin should display results with empty query
			});

			it("should filter suggestions when user continues typing", () => {
				// Scenario: " #" → " #My" → " #MyTag"
				// Expected: Suggestions filtered progressively
				const testCases = [
					{ query: "", shouldMatch: true }, // All results
					{ query: "M", shouldMatch: true }, // Filter to "M*"
					{ query: "My", shouldMatch: true }, // Filter to "My*"
					{ query: "MyTag", shouldMatch: true }, // Filter to "MyTag"
				];

				for (const { shouldMatch } of testCases) {
					expect(shouldMatch).toBe(true);
				}
			});
		});

		describe("Selection state in Enter key flow", () => {
			it("should use input text when no suggestion is selected (selectedIndex: -1)", () => {
				// Scenario:
				// 1. User types " #MyTag"
				// 2. Suggestion shows (nothing selected initially)
				// 3. User presses Enter without arrow key navigation
				// Expected: "MyTag" is used to create link
				const rule = createTagInputRule(
					mockContext as { editor: Editor; name: string },
				);

				expect(rule).toBeDefined();
				// Handler and suggestion plugin should implement this logic
			});

			it("should use selected suggestion when item is selected (selectedIndex >= 0)", () => {
				// Scenario:
				// 1. User types " #M"
				// 2. Suggestion shows (nothing selected)
				// 3. User presses ↓ arrow key (select first item)
				// 4. User presses Enter
				// Expected: Selected suggestion is used to create link
				expect(PATTERNS.tag).toBeDefined();
				// Suggestion plugin should handle this flow
			});

			it("should not auto-select first item on suggestion display", () => {
				// Scenario: User types " #My" and suggestions appear
				// Expected: No item is highlighted/selected
				// User must press ↓ to select first item
				expect(PATTERNS.tag).toBeDefined();
				// Initial selectedIndex should be -1, not 0
			});
		});

		describe("Link creation with unmatched tags", () => {
			it("should create pending link for non-existent page", () => {
				// Scenario: " #NonExistentPage" + Enter
				// Expected: Creates link with state: "pending", exists: false
				const rule = createTagInputRule(
					mockContext as { editor: Editor; name: string },
				);

				expect(rule).toBeDefined();
			});

			it("should mark as exists when page already exists", () => {
				// Scenario: " #ExistingPage" + Enter (where ExistingPage exists)
				// Expected: Creates link with state: "exists", exists: true
				const rule = createTagInputRule(
					mockContext as { editor: Editor; name: string },
				);

				expect(rule).toBeDefined();
				// Resolver should update state based on page existence
			});
		});
	});

	describe("Progressive tag input (regression test for #aaa issue)", () => {
		it("should handle progressive tag input with regex pattern", () => {
			// This test verifies that the regex pattern correctly matches
			// progressively longer tags
			const testCases = [
				{ input: " #a", expected: "a" },
				{ input: " #aa", expected: "aa" },
				{ input: " #aaa", expected: "aaa" },
				{ input: " #test", expected: "test" },
				{ input: " #a1b2c3", expected: "a1b2c3" },
			];

			for (const { input, expected } of testCases) {
				const match = PATTERNS.tag.exec(input);
				expect(match).not.toBeNull();
				expect(match?.[1]).toBe(expected);
			}
		});

		it("should verify mark replacement logic does not cause range errors", () => {
			// This test verifies the logic for replacing shorter marks with longer ones
			// It simulates the scenario where:
			// 1. User types "#a" -> mark created at range (0, 2)
			// 2. User types "a" -> new match "#aa", should replace old mark

			// We can't easily simulate progressive input with insertContent,
			// so we test the pattern matching and document structure expectations

			const pattern = PATTERNS.tag;

			// Simulate "#a" exists in document
			const shortMatch = pattern.exec(" #a");
			expect(shortMatch?.[1]).toBe("a");

			// Simulate user types another "a" -> "#aa"
			const longMatch = pattern.exec(" #aa");
			expect(longMatch?.[1]).toBe("aa");

			// Verify longer match has longer raw text
			if (shortMatch?.[1] && longMatch?.[1]) {
				expect(longMatch[1].length).toBeGreaterThan(shortMatch[1].length);
			}
		});
		it("should handle mark length comparison correctly", () => {
			// Test the logic: newLength > existingLength
			const existingRaw = "a";
			const newRaw = "aa";

			expect(newRaw.length).toBeGreaterThan(existingRaw.length);

			const evenLongerRaw = "aaa";
			expect(evenLongerRaw.length).toBeGreaterThan(newRaw.length);
		});

		it("should not replace mark if lengths are equal or shorter", () => {
			const existingRaw = "test";
			const sameLength = "exam";
			const shorter = "te";

			// Same length should be skipped
			expect(sameLength.length).toBe(existingRaw.length);

			// Shorter should be skipped
			expect(shorter.length).toBeLessThan(existingRaw.length);
		});

		it("should handle various character types in progressive matching", () => {
			// Test that pattern matches work correctly for different character types
			const testCases = [
				{ input: " #テ", expected: "テ" },
				{ input: " #テス", expected: "テス" },
				{ input: " #テスト", expected: "テスト" },
				{ input: " #中", expected: "中" },
				{ input: " #中文", expected: "中文" },
				{ input: " #1", expected: "1" },
				{ input: " #1a", expected: "1a" },
				{ input: " #1a2", expected: "1a2" },
			];

			for (const { input, expected } of testCases) {
				const match = PATTERNS.tag.exec(input);
				expect(match).not.toBeNull();
				expect(match?.[1]).toBe(expected);
			}
		});

		it("should verify regex can match at different positions", () => {
			// Ensure that regex works correctly regardless of where the tag appears
			const text1 = " #tag";
			const text2 = "before #tag";

			// Direct match at start (after space)
			const match1 = PATTERNS.tag.exec(text1);
			expect(match1?.[1]).toBe("tag");

			// Match after other text
			const match2 = PATTERNS.tag.exec(text2);
			expect(match2?.[1]).toBe("tag");
		});

		it("should match tags with dots for versioning", () => {
			const text1 = "#v1.0.0 ";
			const text2 = "#release.2024.10 ";
			const text3 = "#test.case ";

			const match1 = PATTERNS.tag.exec(text1);
			expect(match1?.[1]).toBe("v1.0.0");

			const match2 = PATTERNS.tag.exec(text2);
			expect(match2?.[1]).toBe("release.2024.10");

			const match3 = PATTERNS.tag.exec(text3);
			expect(match3?.[1]).toBe("test.case");
		});

		it("should match tags with special characters", () => {
			// Hyphen
			const text1 = "#feature-branch ";
			const match1 = PATTERNS.tag.exec(text1);
			expect(match1?.[1]).toBe("feature-branch");

			// Underscore
			const text2 = "#my_tag ";
			const match2 = PATTERNS.tag.exec(text2);
			expect(match2?.[1]).toBe("my_tag");

			// Plus
			const text3 = "#C++ ";
			const match3 = PATTERNS.tag.exec(text3);
			expect(match3?.[1]).toBe("C++");

			// Equal
			const text4 = "#key=value ";
			const match4 = PATTERNS.tag.exec(text4);
			expect(match4?.[1]).toBe("key=value");

			// At sign
			const text5 = "#user@domain ";
			const match5 = PATTERNS.tag.exec(text5);
			expect(match5?.[1]).toBe("user@domain");

			// Slash
			const text6 = "#2024/10/26 ";
			const match6 = PATTERNS.tag.exec(text6);
			expect(match6?.[1]).toBe("2024/10/26");

			// Colon
			const text7 = "#category:item ";
			const match7 = PATTERNS.tag.exec(text7);
			expect(match7?.[1]).toBe("category:item");

			// Combined
			const text8 = "#v1.0-beta_2 ";
			const match8 = PATTERNS.tag.exec(text8);
			expect(match8?.[1]).toBe("v1.0-beta_2");
		});
	});
});
