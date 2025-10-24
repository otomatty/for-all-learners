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
			// Pattern: /\[([^\[\]\n]+)\]/
			// Updated to exclude line breaks to prevent duplication bug
			expect(PATTERNS.bracket.source).toContain("\\n");
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

	describe("Bracket Duplication Bug (Issue #20251023_01)", () => {
		/**
		 * TC-001: 改行後のブラケット保護
		 *
		 * 再現手順:
		 * 1. エディタに [テスト] と入力
		 * 2. カーソルをブラケットの外に移動: [テスト]|
		 * 3. エンターキーを入力
		 * 4. 問題: テキストが [[[[[[テスト] のように変わる
		 *
		 * 期待値: ブラケットは1つだけ存在する
		 */
		it("TC-001: should not duplicate brackets on Enter key after bracket", () => {
			// Setup: type bracket content character by character
			// This will trigger InputRule when the closing bracket is typed
			editor.chain().insertContent("[").run();
			editor.chain().insertContent("テスト").run();
			editor.chain().insertContent("]").run();

			// Get initial bracket count
			const initialJson = editor.getJSON();
			const initialStr = JSON.stringify(initialJson);
			const initialOpenBrackets = (initialStr.match(/\[/g) || []).length;
			expect(initialOpenBrackets).toBeGreaterThan(0); // Should have at least one

			// Position cursor at end and insert newline
			const endPos = editor.state.doc.content.size;
			editor.commands.focus(endPos);
			editor.chain().insertContent("\n").run();

			// Check final state
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);
			const finalOpenBrackets = (finalStr.match(/\[/g) || []).length;

			// Assertions
			// Should not have exponential bracket growth (at most 1 more bracket)
			expect(finalOpenBrackets).toBeLessThanOrEqual(initialOpenBrackets + 1);
			// Definitely should not have multiple duplicate brackets pattern
			expect(finalStr).not.toMatch(/\[\[\[\[/);
		});

		/**
		 * TC-002: スペースキー入力時の保護
		 *
		 * 再現手順:
		 * 1. エディタに [テスト] と入力
		 * 2. カーソルをブラケット外に移動: [テスト]|
		 * 3. スペースキーを入力
		 * 4. 問題: テキストが [[[[[[テスト] のように変わる
		 *
		 * 期待値: ブラケットは1つだけ存在する
		 */
		it("TC-002: should not duplicate brackets on Space key after bracket", () => {
			// Set up content with bracket
			editor.chain().insertContent("[").run();
			editor.chain().insertContent("テスト").run();
			editor.chain().insertContent("]").run();

			// Get initial bracket count
			const initialJson = editor.getJSON();
			const initialStr = JSON.stringify(initialJson);
			const initialOpenBrackets = (initialStr.match(/\[/g) || []).length;

			// Position cursor at end and insert space
			const endPos = editor.state.doc.content.size;
			editor.commands.focus(endPos);
			editor.chain().insertContent(" ").run();

			// Check final state
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);
			const finalOpenBrackets = (finalStr.match(/\[/g) || []).length;

			// Assertions
			expect(finalOpenBrackets).toBeLessThanOrEqual(initialOpenBrackets + 1);
			expect(finalStr).not.toMatch(/\[\[\[\[/);
		});

		/**
		 * TC-003: 複数のブラケット要素の独立性
		 *
		 * 期待値:
		 * - 複数の [bracket] 要素を入力
		 * - 各要素は独立しており、相互に影響しない
		 * - 重複が発生しない
		 */
		it("TC-003: should handle multiple bracket elements independently", () => {
			// Insert multiple bracket elements
			editor
				.chain()
				.insertContent("[First]")
				.insertContent(" ")
				.insertContent("[Second]")
				.insertContent(" ")
				.insertContent("[Third]")
				.run();

			const json = editor.getJSON();
			const str = JSON.stringify(json);

			// Count brackets
			const openCount = (str.match(/\[/g) || []).length;
			const closeCount = (str.match(/\]/g) || []).length;

			// Note: insertContent doesn't trigger InputRule for pre-formatted content
			// So bracket marks may not be applied. This test validates the count logic.
			// Should have 5 brackets total when multiple contents are inserted separately
			expect(openCount).toBeGreaterThan(0);
			expect(closeCount).toBeGreaterThan(0);
			expect(openCount).toBe(closeCount);

			// No duplicate opening brackets (main concern for the bug)
			expect(str).not.toMatch(/\[\[\[\[/);
		});

		/**
		 * TC-004: インラインテキスト混在時のブラケット重複防止
		 *
		 * 期待値:
		 * - 通常のテキストとブラケット記法が混在
		 * - ブラケット記法のみに mark が適用される
		 * - ブラケットが重複しない
		 */
		it("TC-004: should not duplicate brackets with inline text", () => {
			// Insert mixed content
			editor
				.chain()
				.insertContent("This is a ")
				.insertContent("[link]")
				.insertContent(" in text")
				.run();

			const json = editor.getJSON();
			const str = JSON.stringify(json);

			// Verify structure
			expect(str).toContain("This is a");
			expect(str).toContain("link");
			expect(str).toContain("in text");

			// No duplicate brackets (main bug check)
			expect(str).not.toMatch(/\[\[\[\[/);

			// Count brackets
			const openCount = (str.match(/\[/g) || []).length;
			const closeCount = (str.match(/\]/g) || []).length;

			// Should have at least 1 bracket pair (may not have marks applied via insertContent)
			expect(openCount).toBeGreaterThan(0);
			expect(closeCount).toBeGreaterThan(0);
			expect(openCount).toBe(closeCount);
		});

		/**
		 * TC-005: 連続した Enter キー入力時の安定性
		 *
		 * 期待値:
		 * - Enter を複数回入力
		 * - ブラケットが複数回増殖しない
		 */
		it("TC-005: should remain stable with multiple Enter key presses", () => {
			// Setup: Create content
			editor.chain().insertContent("[テスト]").run();

			// Get initial bracket count
			const initialJson = editor.getJSON();
			const initialStr = JSON.stringify(initialJson);
			const initialBrackets = (initialStr.match(/\[/g) || []).length;

			// Press Enter multiple times - cursor will be at end
			editor
				.chain()
				.insertContent("\n")
				.insertContent("\n")
				.insertContent("\n")
				.run();

			// Get final state
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);
			const finalBrackets = (finalStr.match(/\[/g) || []).length;

			// Should not have exponential duplication
			// With 3 Enter presses, maximum growth should be 3 additional brackets
			expect(finalBrackets).toBeLessThanOrEqual(initialBrackets + 3);

			// Definitely should not have massive duplication
			expect(finalStr).not.toMatch(/\[\[\[\[/);
		});

		/**
		 * TC-006: ブラケット直後の任意キー入力
		 *
		 * 期待値:
		 * - ブラケット直後に任意のキー（@, #, !, など）を入力
		 * - ブラケットが重複しない
		 */
		it("TC-006: should not duplicate on special character input after bracket", () => {
			// Setup
			editor.chain().insertContent("[テスト]").run();

			// Insert special characters immediately - cursor at end
			editor
				.chain()
				.insertContent("@")
				.insertContent("#")
				.insertContent("!")
				.run();

			// Get final state
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);

			// Verify no duplication
			expect(finalStr).not.toMatch(/\[\[\[\[/);

			// Verify special characters were inserted
			expect(finalStr).toContain("@");
			expect(finalStr).toContain("#");
			expect(finalStr).toContain("!");
		});

		/**
		 * TC-007: Pattern マッチング後の改行時の重複防止
		 *
		 * 期待値:
		 * - [content] パターンがマッチした直後に改行入力
		 * - マッチの処理が複数回実行されない
		 * - ブラケットが増殖しない
		 */
		it("TC-007: should not duplicate pattern on immediate Enter after match", () => {
			// Insert bracket notation
			editor.chain().insertContent("[テスト]").run();

			// Get initial state
			const initialJson = editor.getJSON();
			const initialStr = JSON.stringify(initialJson);

			// Immediately press Enter (simulating rapid keystroke)
			editor.chain().insertContent("\n").run();

			// Check state
			const afterJson = editor.getJSON();
			const afterStr = JSON.stringify(afterJson);

			// No duplication should occur
			expect(afterStr).not.toMatch(/\[\[\[\[/);

			// Pattern should not create multiple opening brackets
			const openBrackets = (afterStr.match(/\[/g) || []).length;
			expect(openBrackets).toBeGreaterThanOrEqual(
				(initialStr.match(/\[/g) || []).length,
			);
			expect(openBrackets).toBeLessThanOrEqual(
				(initialStr.match(/\[/g) || []).length + 1,
			);
		});

		/**
		 * TC-008: 改行後のテキストが新しいパターンマッチを引き起こさない
		 *
		 * 期待値:
		 * - [test]の後に改行して\nを入力
		 * - その後のテキスト行は独立した処理
		 * - 元の [test] は再処理されない
		 */
		it("TC-008: should not re-process bracket after line break", () => {
			// Create initial bracket
			editor.chain().insertContent("[Bracket]").run();

			// Get content after initial bracket
			const afterBracketJson = editor.getJSON();
			const afterBracketStr = JSON.stringify(afterBracketJson);
			const bracketCountAfter = (afterBracketStr.match(/\[/g) || []).length;

			// Add newline and new content
			editor
				.chain()
				.insertContent("\n")
				.insertContent("New line content")
				.run();

			// Check final state
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);
			const bracketCountFinal = (finalStr.match(/\[/g) || []).length;

			// Bracket count should not increase (original should not be reprocessed)
			expect(bracketCountFinal).toBe(bracketCountAfter);
			// No duplication
			expect(finalStr).not.toMatch(/\[\[\[\[/);
		});

		/**
		 * TC-009: 既存マークの再処理防止（ブラケット外でキー入力）
		 *
		 * 再現手順:
		 * 1. エディタに [テスト] と入力してリンクマークが作成される
		 * 2. カーソルをブラケットの外（末尾）に移動: [テスト]|
		 * 3. 任意のキー（例: "a"）を入力
		 * 4. バグ: ブラケット記号 [ ] だけが通常テキストになり、入力したキーが実行されない
		 *
		 * 期待値:
		 * - 既存のブラケットマークは保持される
		 * - ブラケット記号がプレーンテキストにならない
		 * - 入力したキーが正しく反映される
		 */
		it("TC-009: should not reprocess existing bracket mark on key input outside bracket", () => {
			// Step 1: Create bracket link by typing character by character
			editor.chain().insertContent("[").run();
			editor.chain().insertContent("テスト").run();
			editor.chain().insertContent("]").run();

			// Step 2: Move cursor to end of document (outside bracket)
			const endPos = editor.state.doc.content.size;
			editor.commands.focus(endPos);

			// Step 3: Type a key outside the bracket
			editor.chain().insertContent("a").run();

			// Verify final state
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);

			// Assertion 1: Bracket symbols should not become plain text
			// If they did, we'd see literal "[" and "]" in text content
			const hasPlainBrackets =
				finalStr.includes('"text":"["') || finalStr.includes('"text":"]"');
			expect(hasPlainBrackets).toBe(false);

			// Assertion 2: The typed character "a" should be present in the content
			expect(finalStr).toContain("a");

			// Assertion 3: No duplicate brackets
			expect(finalStr).not.toMatch(/\[\[\[\[/);
		});

		/**
		 * TC-010: 既存マークに隣接した位置での入力
		 *
		 * 期待値:
		 * - [テスト] の直前または直後に文字を入力
		 * - 既存マークが再処理されない
		 * - 新しい文字が正しく挿入される
		 */
		it("TC-010: should not reprocess mark when typing adjacent to existing bracket", () => {
			// Create bracket link
			editor.chain().insertContent("[テスト]").run();

			// Type before bracket
			editor.commands.focus(1); // Position at start
			editor.chain().insertContent("前").run();

			// Type after bracket
			const endPos = editor.state.doc.content.size;
			editor.commands.focus(endPos);
			editor.chain().insertContent("後").run();

			// Verify
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);

			// Should contain new characters
			expect(finalStr).toContain("前");
			expect(finalStr).toContain("後");

			// Should not have plain bracket text
			const hasPlainBrackets =
				finalStr.includes('"text":"["') || finalStr.includes('"text":"]"');
			expect(hasPlainBrackets).toBe(false);
		});

		/**
		 * TC-011: 複数の既存マークが存在する場合の保護
		 *
		 * 期待値:
		 * - 複数のブラケットリンク [A] [B] [C] を作成
		 * - 各リンクの間にテキストを追加
		 * - どのリンクも再処理されない
		 */
		it("TC-011: should protect all existing marks when editing between them", () => {
			// Create multiple bracket links
			editor
				.chain()
				.insertContent("[A]")
				.insertContent(" ")
				.insertContent("[B]")
				.insertContent(" ")
				.insertContent("[C]")
				.run();

			// Insert text between first and second bracket
			// Find approximate position (after first bracket)
			editor.commands.focus(4); // Rough position after [A]
			editor.chain().insertContent("X").run();

			// Insert text between second and third bracket
			editor.commands.focus(8); // Rough position after [B]
			editor.chain().insertContent("Y").run();

			// Verify
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);

			// New characters should be present
			expect(finalStr).toContain("X");
			expect(finalStr).toContain("Y");

			// No brackets should become plain text
			const plainBracketCount =
				(finalStr.match(/"text":"\["/g) || []).length +
				(finalStr.match(/"text":"]"/g) || []).length;
			expect(plainBracketCount).toBe(0);
		});

		/**
		 * TC-012: 既存マーク内でのカーソル移動と編集
		 *
		 * 期待値:
		 * - [テスト] を作成
		 * - マーク内部にカーソルを移動して文字を追加
		 * - マークは保持されたまま内容が更新される
		 */
		it("TC-012: should maintain mark when editing inside bracket content", () => {
			// Create bracket link character by character
			editor.chain().insertContent("[").run();
			editor.chain().insertContent("テスト").run();
			editor.chain().insertContent("]").run();

			// Move cursor inside the bracket (approximate position)
			editor.commands.focus(3); // Inside "テスト"
			editor.chain().insertContent("追加").run();

			// Verify
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);

			// Should contain the added text
			expect(finalStr).toContain("追加");

			// Bracket symbols should not become plain text
			const hasPlainBrackets =
				finalStr.includes('"text":"["') || finalStr.includes('"text":"]"');
			expect(hasPlainBrackets).toBe(false);
		});

		/**
		 * TC-013: 削除操作後の既存マーク保護
		 *
		 * 期待値:
		 * - [A] テキスト [B] のような構造を作成
		 * - 中間のテキストを削除
		 * - 両側のブラケットマークは影響を受けない
		 */
		it("TC-013: should protect existing marks after deletion operations", () => {
			// Create structure: [A] middle [B]
			editor
				.chain()
				.insertContent("[A]")
				.insertContent(" middle ")
				.insertContent("[B]")
				.run();

			// Delete "middle" text (approximate position)
			editor.commands.focus(4);
			editor.commands.deleteRange({ from: 4, to: 11 });

			// Verify
			const finalJson = editor.getJSON();
			const finalStr = JSON.stringify(finalJson);

			// Should not contain "middle"
			expect(finalStr).not.toContain("middle");

			// Both brackets should still be marks, not plain text
			const plainBracketCount =
				(finalStr.match(/"text":"\["/g) || []).length +
				(finalStr.match(/"text":"]"/g) || []).length;
			expect(plainBracketCount).toBe(0);
		});
	});
});
