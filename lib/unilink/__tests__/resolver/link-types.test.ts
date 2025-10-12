/**
 * Link Types Module Test Suite
 * Tests for link type detection and handling
 *
 * @fileoverview Tests for lib/unilink/resolver/link-types.ts
 * Focus on pure functions without complex external dependencies
 */

import { describe, expect, it } from "vitest";

// Note: Tests focus on pure functions without external dependencies
// Complex integrations (toast, Supabase, window) are covered in integration tests

describe("Link Types Module", () => {
  describe("parseBracketContent", () => {
    it("should detect icon notation", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("username.icon");

      expect(result.type).toBe("icon");
      expect(result.isIcon).toBe(true);
      expect(result.userSlug).toBe("username");
      expect(result.slug).toBe("username");
    });

    it("should detect external links with https", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("https://example.com");

      expect(result.type).toBe("external");
      expect(result.isIcon).toBe(false);
      expect(result.slug).toBe("https://example.com");
    });

    it("should detect external links with http", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("http://example.com");

      expect(result.type).toBe("external");
      expect(result.isIcon).toBe(false);
      expect(result.slug).toBe("http://example.com");
    });

    it("should treat regular text as page link", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("Page Title");

      expect(result.type).toBe("page");
      expect(result.isIcon).toBe(false);
      expect(result.slug).toBe("Page Title");
    });

    it("should handle text with spaces", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("My Page Title");

      expect(result.type).toBe("page");
      expect(result.slug).toBe("My Page Title");
    });

    it("should handle text with special characters", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("Page-Title_123");

      expect(result.type).toBe("page");
      expect(result.slug).toBe("Page-Title_123");
    });

    it("should handle Japanese text", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("日本語ページ");

      expect(result.type).toBe("page");
      expect(result.slug).toBe("日本語ページ");
    });

    it("should handle empty string", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("");

      expect(result.type).toBe("page");
      expect(result.slug).toBe("");
    });

    it("should handle .icon with special characters", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("user-name_123.icon");

      expect(result.type).toBe("icon");
      expect(result.userSlug).toBe("user-name_123");
    });

    it("should not treat .icon in middle as icon notation", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("text.icon.more");

      expect(result.type).toBe("page");
      expect(result.slug).toBe("text.icon.more");
    });

    it("should handle URLs with paths", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("https://example.com/path/to/page");

      expect(result.type).toBe("external");
      expect(result.slug).toBe("https://example.com/path/to/page");
    });

    it("should handle URLs with query parameters", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("https://example.com?param=value");

      expect(result.type).toBe("external");
      expect(result.slug).toBe("https://example.com?param=value");
    });

    it("should handle URLs with fragments", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("https://example.com#section");

      expect(result.type).toBe("external");
      expect(result.slug).toBe("https://example.com#section");
    });

    it("should be case-insensitive for protocol detection", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result1 = parseBracketContent("HTTP://example.com");
      const result2 = parseBracketContent("HTTPS://example.com");

      expect(result1.type).toBe("external");
      expect(result2.type).toBe("external");
    });

    it("should handle mixed case in .icon notation", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("UserName.icon");

      expect(result.type).toBe("icon");
      expect(result.userSlug).toBe("UserName");
    });

    it("should handle numbers in usernames", async () => {
      const { parseBracketContent } = await import("../../resolver/link-types");

      const result = parseBracketContent("user123.icon");

      expect(result.type).toBe("icon");
      expect(result.userSlug).toBe("user123");
    });
  });

  describe("isExternalLink", () => {
    it("should return true for https links", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("https://example.com")).toBe(true);
    });

    it("should return true for http links", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("http://example.com")).toBe(true);
    });

    it("should return false for regular text", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("Page Title")).toBe(false);
    });

    it("should return false for empty string", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("")).toBe(false);
    });

    it("should be case-insensitive", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("HTTP://example.com")).toBe(true);
      expect(isExternalLink("HTTPS://example.com")).toBe(true);
    });

    it("should return false for relative URLs", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("/pages/123")).toBe(false);
      expect(isExternalLink("./relative")).toBe(false);
      expect(isExternalLink("../parent")).toBe(false);
    });

    it("should return false for ftp links", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("ftp://example.com")).toBe(false);
    });

    it("should return true for URLs with paths", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("https://example.com/path/to/page")).toBe(true);
    });

    it("should return true for URLs with query parameters", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("https://example.com?param=value")).toBe(true);
    });

    it("should return true for URLs with fragments", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("https://example.com#section")).toBe(true);
    });

    it("should return false for mailto links", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("mailto:test@example.com")).toBe(false);
    });

    it("should return false for tel links", async () => {
      const { isExternalLink } = await import("../../resolver/link-types");

      expect(isExternalLink("tel:+1234567890")).toBe(false);
    });
  });

  // Note: Tests for openExternalLink, handleMissingLinkClick, and resolveIconLink
  // are skipped as they require complex mocking of:
  // - window object
  // - toast notifications
  // - Supabase client
  // - TipTap editor
  //
  // These functionalities should be tested in integration tests or E2E tests
  // where the full environment is available.
  //
  // Coverage from existing integration tests:
  // - resolver-phase3.test.ts covers icon link resolution
  // - resolver-phase2.test.ts covers page creation flows
});
