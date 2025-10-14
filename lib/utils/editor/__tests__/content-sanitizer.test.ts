import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import {
  sanitizeContent,
  removeLegacyMarks,
  removeEmptyTextNodes,
} from "../content-sanitizer";

describe("content-sanitizer", () => {
  describe("sanitizeContent", () => {
    it("should convert legacy pageLink mark to unilink", () => {
      const doc: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Test Page",
                marks: [
                  {
                    type: "pageLink",
                    attrs: {
                      title: "Test Page",
                      pageId: "test-page-id",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = sanitizeContent(doc);

      expect(result.content?.[0]).toMatchObject({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Test Page",
            marks: [
              {
                type: "unilink",
                attrs: expect.objectContaining({
                  variant: "bracket",
                  raw: "Test Page",
                  text: "Test Page",
                  key: "test page",
                  pageId: "test-page-id",
                  href: "/pages/test-page-id",
                  state: "exists",
                  exists: true,
                }),
              },
            ],
          },
        ],
      });
    });

    it("should convert legacy link mark (internal link) to unilink", () => {
      const doc: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Internal Link",
                marks: [
                  {
                    type: "link",
                    attrs: {
                      href: "/pages/internal-page-id",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = sanitizeContent(doc);

      expect(result.content?.[0]).toMatchObject({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Internal Link",
            marks: [
              {
                type: "unilink",
                attrs: expect.objectContaining({
                  variant: "bracket",
                  raw: "Internal Link",
                  text: "Internal Link",
                  key: "internal link",
                  pageId: "internal-page-id",
                  href: "/pages/internal-page-id",
                  state: "exists",
                  exists: true,
                }),
              },
            ],
          },
        ],
      });
    });

    it("should keep external link marks as-is", () => {
      const doc: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "External Link",
                marks: [
                  {
                    type: "link",
                    attrs: {
                      href: "https://example.com",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = sanitizeContent(doc);

      expect(result.content?.[0]).toMatchObject({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "External Link",
            marks: [
              {
                type: "link",
                attrs: {
                  href: "https://example.com",
                },
              },
            ],
          },
        ],
      });
    });

    it("should remove empty text nodes", () => {
      const doc: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
              {
                type: "text",
                text: "Valid text",
              },
              {
                type: "text",
                text: "",
              },
            ],
          },
        ],
      };

      const result = sanitizeContent(doc);

      expect(result.content?.[0]).toMatchObject({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Valid text",
          },
        ],
      });
    });

    it("should handle nested nodes correctly", () => {
      const doc: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Before ",
              },
              {
                type: "text",
                text: "legacy link",
                marks: [
                  {
                    type: "pageLink",
                    attrs: {
                      title: "legacy link",
                      pageId: "legacy-id",
                    },
                  },
                ],
              },
              {
                type: "text",
                text: " after",
              },
            ],
          },
        ],
      };

      const result = sanitizeContent(doc);

      expect(result.content?.[0]?.content).toHaveLength(3);
      expect(result.content?.[0]?.content?.[1]).toMatchObject({
        type: "text",
        text: "legacy link",
        marks: [
          {
            type: "unilink",
          },
        ],
      });
    });

    it("should handle empty document", () => {
      const doc: JSONContent = {
        type: "doc",
        content: [],
      };

      const result = sanitizeContent(doc);

      expect(result).toEqual({
        type: "doc",
        content: [],
      });
    });

    it("should convert pending pageLink marks (without pageId)", () => {
      const doc: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Pending Link",
                marks: [
                  {
                    type: "pageLink",
                    attrs: {
                      title: "Pending Link",
                      pageId: "",
                    },
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = sanitizeContent(doc);

      expect(result.content?.[0]).toMatchObject({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Pending Link",
            marks: [
              {
                type: "unilink",
                attrs: expect.objectContaining({
                  variant: "bracket",
                  raw: "Pending Link",
                  text: "Pending Link",
                  key: "pending link",
                  pageId: null,
                  href: "#",
                  state: "pending",
                  exists: false,
                }),
              },
            ],
          },
        ],
      });
    });
  });

  describe("removeLegacyMarks", () => {
    it("should remove pageLink marks", () => {
      const node: JSONContent = {
        type: "text",
        text: "Test",
        marks: [
          {
            type: "pageLink",
            attrs: { title: "Test", pageId: "test-id" },
          },
        ],
      };

      const result = removeLegacyMarks(node);

      expect(result).toEqual({
        type: "text",
        text: "Test",
      });
    });

    it("should remove link marks", () => {
      const node: JSONContent = {
        type: "text",
        text: "Test",
        marks: [
          {
            type: "link",
            attrs: { href: "/pages/test-id" },
          },
        ],
      };

      const result = removeLegacyMarks(node);

      expect(result).toEqual({
        type: "text",
        text: "Test",
      });
    });

    it("should keep other marks", () => {
      const node: JSONContent = {
        type: "text",
        text: "Test",
        marks: [
          {
            type: "bold",
          },
          {
            type: "italic",
          },
        ],
      };

      const result = removeLegacyMarks(node);

      expect(result).toEqual(node);
    });

    it("should handle node without marks", () => {
      const node: JSONContent = {
        type: "text",
        text: "Test",
      };

      const result = removeLegacyMarks(node);

      expect(result).toEqual(node);
    });

    it("should handle non-text node", () => {
      const node: JSONContent = {
        type: "paragraph",
        content: [],
      };

      const result = removeLegacyMarks(node);

      expect(result).toEqual(node);
    });
  });

  describe("removeEmptyTextNodes", () => {
    it("should remove empty text nodes from content", () => {
      const node: JSONContent = {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "",
          },
          {
            type: "text",
            text: "Valid",
          },
          {
            type: "text",
            text: "   ",
          },
        ],
      };

      const result = removeEmptyTextNodes(node);

      expect(result).toEqual({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Valid",
          },
        ],
      });
    });

    it("should remove content property from empty paragraph", () => {
      const node: JSONContent = {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "  ",
          },
        ],
      };

      const result = removeEmptyTextNodes(node);

      expect(result).toEqual({
        type: "paragraph",
      });
      expect(result).not.toHaveProperty("content");
    });

    it("should handle nested nodes", () => {
      const node: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Valid",
              },
            ],
          },
        ],
      };

      const result = removeEmptyTextNodes(node);

      expect(result.content).toHaveLength(2);
      expect(result.content?.[0]).not.toHaveProperty("content");
      expect(result.content?.[1]).toHaveProperty("content");
    });

    it("should handle node without content", () => {
      const node: JSONContent = {
        type: "text",
        text: "Test",
      };

      const result = removeEmptyTextNodes(node);

      expect(result).toEqual(node);
    });
  });
});
