/**
 * tag-rule.ts のユニットテスト
 * tag input rule の動作をテスト
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { setupJSDOMEnvironment } from "@/lib/__tests__/helpers";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { createTagInputRule } from "../tag-rule";
import { PATTERNS } from "../../config";

// Setup jsdom environment for this test
setupJSDOMEnvironment();

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
        { input: "#tag", shouldMatch: true, expected: "tag" },
        { input: "#タグ", shouldMatch: true, expected: "タグ" },
        { input: "#tag123", shouldMatch: true, expected: "tag123" },
        { input: "#テスト", shouldMatch: true, expected: "テスト" },
        { input: "#中文", shouldMatch: true, expected: "中文" },
        { input: "# space", shouldMatch: false }, // space after hash
        { input: "notag", shouldMatch: false },
        { input: "#", shouldMatch: false },
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
        mockContext as { editor: Editor; name: string }
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
        "#simple",
        "Multiple #tags and #phrases",
        "#ひらがな",
        "#カタカナ",
        "#漢字",
        "#测试", // Chinese characters
        "#tag1",
        "#tag123",
        "#a",
        "#Z",
      ];

      for (const pattern of validPatterns) {
        const match = PATTERNS.tag.exec(pattern);
        expect(match).not.toBeNull();
      }
    });

    it("should not match invalid tag patterns", () => {
      const invalidPatterns = [
        "# space",
        "#",
        "# ",
        "#  ",
        "normal text",
        "no#hash",
        "#-dash", // dash not allowed
        "#_underscore", // underscore not allowed
        "#@symbol", // special symbols not allowed
        "#tag!", // special chars not allowed
        "#tag?", // special chars not allowed
        "#tag.", // special chars not allowed
        "#tag,", // special chars not allowed
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
        "#abc",
        "#ABC",
        "#123",
        "#abc123",
        "#ABC123",
        "#a1b2c3",
      ];

      for (const tag of alphanumeric) {
        const match = PATTERNS.tag.exec(tag);
        expect(match).not.toBeNull();
      }
    });

    it("should support Japanese characters", () => {
      const japanese = [
        "#ひらがな",
        "#カタカナ",
        "#漢字",
        "#混合文字列",
        "#ひらカナ漢字123",
      ];

      for (const tag of japanese) {
        const match = PATTERNS.tag.exec(tag);
        expect(match).not.toBeNull();
      }
    });

    it("should support CJK characters", () => {
      const supportedCjk = [
        "#中文",
        "#測試",
        "#한글", // Korean characters now supported
        "#테스트", // Korean characters now supported
      ];

      for (const tag of supportedCjk) {
        const match = PATTERNS.tag.exec(tag);
        expect(match).not.toBeNull();
      }
    });

    it("should support Korean characters", () => {
      const korean = [
        "#한글",
        "#테스트",
        "#한국어",
        "#안녕하세요",
        "#가나다라마바사",
        "#혼합문자123", // Mixed Korean and numbers
      ];

      for (const tag of korean) {
        const match = PATTERNS.tag.exec(tag);
        expect(match).not.toBeNull();
      }
    });

    it("should support mixed CJK characters", () => {
      const mixedCjk = [
        "#中한日", // Chinese + Korean + Japanese
        "#日本語한국어", // Japanese + Korean
        "#중국漢字", // Korean + Chinese
        "#混合언어123", // Mixed languages with numbers
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
        "#a", // 1文字
        `#${"a".repeat(50)}`, // 50文字
        "#日本語タグ", // マルチバイト文字
      ];

      for (const tag of validLengthTags) {
        const match = PATTERNS.tag.exec(tag);
        expect(match).not.toBeNull();
      }
    });

    it("should not match tags exceeding length limit", () => {
      // 51文字以上のタグ
      const invalidLengthTags = [
        `#${"a".repeat(51)}`, // 51文字
        `#${"a".repeat(100)}`, // 100文字
      ];

      for (const tag of invalidLengthTags) {
        const match = PATTERNS.tag.exec(tag);
        expect(match).toBeNull();
      }
    });
  });

  describe("Word boundary behavior", () => {
    it("should only match at word boundaries", () => {
      const wordBoundaryTests = [
        { input: "hello#tag", shouldMatch: false }, // 単語境界ではない
        { input: "hello #tag", shouldMatch: true, expected: "tag" }, // スペース後
        { input: " #tag", shouldMatch: true, expected: "tag" }, // 行頭スペース後
        { input: "#tag", shouldMatch: true, expected: "tag" }, // 行頭
        { input: "。#tag", shouldMatch: true, expected: "tag" }, // 句読点後
        { input: "！#tag", shouldMatch: true, expected: "tag" }, // 感嘆符後
        { input: "？#tag", shouldMatch: true, expected: "tag" }, // 疑問符後
      ];

      for (const { input, shouldMatch, expected } of wordBoundaryTests) {
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

  describe("Configuration", () => {
    it("should use correct regex pattern", () => {
      // Test the pattern directly
      expect(PATTERNS.tag.source).toBe(
        "\\B#([a-zA-Z0-9\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FAF\\u3400-\\u4DBF\\uAC00-\\uD7AF]{1,50})$"
      );
      expect(PATTERNS.tag.global).toBe(false);
      expect(PATTERNS.tag.multiline).toBe(false);
    });

    it("should handle pattern edge cases", () => {
      const edgeCases = [
        { text: "#a", shouldMatch: true, expected: "a" },
        { text: "#1", shouldMatch: true, expected: "1" },
        { text: "#あ", shouldMatch: true, expected: "あ" },
        { text: "#ア", shouldMatch: true, expected: "ア" },
        { text: "#中", shouldMatch: true, expected: "中" },
        { text: "#ㄱ", shouldMatch: false }, // Korean Jamo not included
        { text: "#！", shouldMatch: false }, // Special characters not allowed
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
        mockContext as { editor: Editor; name: string }
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
        `#${"a".repeat(1000)}`, // Very long string
        `#${"あ".repeat(500)}`, // Long Japanese string
        "####################", // Multiple hashes
        `#${"!".repeat(100)}`, // Invalid characters
      ];

      for (const input of potentialProblematicInputs) {
        const start = performance.now();
        PATTERNS.tag.exec(input);
        const end = performance.now();

        // Should complete within reasonable time (less than 10ms)
        expect(end - start).toBeLessThan(10);
      }
    });
  });
});
