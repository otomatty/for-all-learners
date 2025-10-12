/**
 * rendering.ts のユニットテスト
 * HTML レンダリングとパース処理のテスト
 */

import { describe, expect, it } from "vitest";
import { renderHTML, parseHTML } from "../rendering";
import { DEFAULT_OPTIONS } from "../config";

describe("UnifiedLinkMark Rendering", () => {
  describe("renderHTML", () => {
    it("should render as anchor tag", () => {
      const result = renderHTML(
        {
          variant: "bracket",
          raw: "Test",
          text: "Test",
          key: "test",
          href: "/pages/123",
          state: "exists",
          exists: true,
          markId: "test-id",
        },
        DEFAULT_OPTIONS
      );

      expect(result[0]).toBe("a");
      expect(result[2]).toBe(0);
    });

    it("should include variant class", () => {
      const result = renderHTML(
        {
          variant: "bracket",
          raw: "Test",
          text: "Test",
          key: "test",
          href: "/pages/123",
          state: "exists",
          exists: true,
          markId: "test-id",
        },
        DEFAULT_OPTIONS
      );

      const attributes = result[1] as Record<string, unknown>;
      expect(attributes.class).toContain("unilink");
      expect(attributes.class).toContain("unilink--bracket");
    });

    it("should include tag variant class", () => {
      const result = renderHTML(
        {
          variant: "tag",
          raw: "Test",
          text: "Test",
          key: "test",
          href: "/pages/123",
          state: "exists",
          exists: true,
          markId: "test-id",
        },
        DEFAULT_OPTIONS
      );

      const attributes = result[1] as Record<string, unknown>;
      expect(attributes.class).toContain("unilink--tag");
    });

    it("should merge custom HTML attributes", () => {
      const customOptions = {
        ...DEFAULT_OPTIONS,
        HTMLAttributes: {
          class: "custom-class",
          "data-custom": "value",
        },
      };

      const result = renderHTML(
        {
          variant: "bracket",
          raw: "Test",
          text: "Test",
          key: "test",
          href: "/pages/123",
          state: "exists",
          exists: true,
          markId: "test-id",
        },
        customOptions
      );

      const attributes = result[1] as Record<string, unknown>;
      expect(attributes.class).toContain("custom-class");
      expect(attributes.class).toContain("unilink--bracket");
      expect(attributes["data-custom"]).toBe("value");
    });

    it("should pass through all attributes", () => {
      const result = renderHTML(
        {
          variant: "bracket",
          raw: "Test",
          text: "Test",
          key: "test",
          href: "/pages/123",
          state: "exists",
          exists: true,
          markId: "test-id",
          "data-page-id": "123",
          "data-key": "test",
        },
        DEFAULT_OPTIONS
      );

      const attributes = result[1] as Record<string, unknown>;
      expect(attributes["data-page-id"]).toBe("123");
      expect(attributes["data-key"]).toBe("test");
    });
  });

  describe("parseHTML", () => {
    it("should return array with tag selector", () => {
      const result = parseHTML();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should parse anchor tags with data-variant", () => {
      const result = parseHTML();

      expect(result[0]).toHaveProperty("tag");
      expect(result[0].tag).toBe("a[data-variant]");
    });
  });
});
