/**
 * config.ts のユニットテスト
 * 定数とデフォルト設定のテスト
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_HTML_ATTRIBUTES,
  DEFAULT_OPTIONS,
  RESOLVER_CONFIG,
  PATTERNS,
} from "../config";

describe("UnifiedLinkMark Config", () => {
  describe("DEFAULT_HTML_ATTRIBUTES", () => {
    it("should have correct default class", () => {
      expect(DEFAULT_HTML_ATTRIBUTES.class).toBe(
        "unilink underline cursor-pointer"
      );
    });
  });

  describe("DEFAULT_OPTIONS", () => {
    it("should have HTMLAttributes", () => {
      expect(DEFAULT_OPTIONS.HTMLAttributes).toBeDefined();
      expect(DEFAULT_OPTIONS.HTMLAttributes).toBe(DEFAULT_HTML_ATTRIBUTES);
    });

    it("should have null autoReconciler by default", () => {
      expect(DEFAULT_OPTIONS.autoReconciler).toBeNull();
    });

    it("should have null noteSlug by default", () => {
      expect(DEFAULT_OPTIONS.noteSlug).toBeNull();
    });

    it("should have null userId by default", () => {
      expect(DEFAULT_OPTIONS.userId).toBeNull();
    });

    it("should have undefined onShowCreatePageDialog by default", () => {
      expect(DEFAULT_OPTIONS.onShowCreatePageDialog).toBeUndefined();
    });
  });

  describe("RESOLVER_CONFIG", () => {
    it("should have correct batch size", () => {
      expect(RESOLVER_CONFIG.batchSize).toBe(10);
    });

    it("should have correct batch delay", () => {
      expect(RESOLVER_CONFIG.batchDelay).toBe(50);
    });

    it("should have correct max retries", () => {
      expect(RESOLVER_CONFIG.maxRetries).toBe(2);
    });

    it("should have correct retry delay base", () => {
      expect(RESOLVER_CONFIG.retryDelayBase).toBe(100);
    });
  });

  describe("PATTERNS", () => {
    describe("bracket pattern", () => {
      it("should match valid bracket notation", () => {
        const text = "Check this [Title]";
        const match = text.match(PATTERNS.bracket);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe("Title");
      });

      it("should not match empty brackets", () => {
        const text = "Check this []";
        const match = text.match(PATTERNS.bracket);
        // Pattern requires at least one character inside brackets
        expect(match).toBeNull();
      });

      it("should not match nested brackets due to pattern restriction", () => {
        const text = "Check this [Title [nested]]";
        const match = text.match(PATTERNS.bracket);
        // Pattern [^\[\]]+ does not match brackets inside
        expect(match).toBeNull();
      });

      it("should match at end of string", () => {
        const text = "[Title]";
        const match = text.match(PATTERNS.bracket);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe("Title");
      });
    });

    describe("tag pattern", () => {
      it("should match valid tag notation with alphanumeric", () => {
        const text = "Check this #tag123";
        const match = text.match(PATTERNS.tag);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe("tag123");
      });

      it("should match Japanese characters", () => {
        const text = "Check this #タグ";
        const match = text.match(PATTERNS.tag);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe("タグ");
      });

      it("should match hiragana", () => {
        const text = "Check this #ひらがな";
        const match = text.match(PATTERNS.tag);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe("ひらがな");
      });

      it("should match kanji", () => {
        const text = "Check this #漢字";
        const match = text.match(PATTERNS.tag);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe("漢字");
      });

      it("should not match tag starting with space", () => {
        const text = "Check this # tag";
        const match = text.match(PATTERNS.tag);
        expect(match).toBeNull();
      });

      it("should not match tags longer than 50 characters", () => {
        const longTag = "a".repeat(51);
        const text = `Check this #${longTag}`;
        const match = text.match(PATTERNS.tag);
        // Pattern limits to {1,50} characters, so won't match 51+ chars
        expect(match).toBeNull();
      });

      it("should match tags with exactly 50 characters", () => {
        const tag = "a".repeat(50);
        const text = `#${tag}`;
        const match = text.match(PATTERNS.tag);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe(tag);
      });

      it("should match at end of string", () => {
        const text = "#tag";
        const match = text.match(PATTERNS.tag);
        expect(match).toBeTruthy();
        expect(match?.[1]).toBe("tag");
      });
    });

    describe("externalUrl pattern", () => {
      it("should match http URLs", () => {
        expect(PATTERNS.externalUrl.test("http://example.com")).toBe(true);
      });

      it("should match https URLs", () => {
        expect(PATTERNS.externalUrl.test("https://example.com")).toBe(true);
      });

      it("should not match relative URLs", () => {
        expect(PATTERNS.externalUrl.test("/pages/123")).toBe(false);
      });

      it("should not match protocol-relative URLs", () => {
        expect(PATTERNS.externalUrl.test("//example.com")).toBe(false);
      });

      it("should not match plain text", () => {
        expect(PATTERNS.externalUrl.test("example.com")).toBe(false);
      });
    });
  });
});
