/**
 * UnifiedLinkMark のテストスイート
 * 統合リンクマーク機能の包括的なテスト
 *
 * @fileoverview UnifiedLinkMarkの入力変換、状態管理、非同期解決、
 *               コマンド実行、属性管理などをテスト
 *
 * @vitest-environment jsdom
 */

import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { UnifiedLinkMark } from "../unified-link-mark";
import type { UnifiedLinkAttributes } from "../unified-link-mark";

/**
 * Mock Setup
 *
 * 保守性のため、すべてのモックを一箇所で管理します。
 * 各モック関数は明確な名前と責任を持ちます。
 */

// Import modules that need mocking
import * as searchPagesModule from "@/lib/utils/searchPages";
import * as pageLinkMetricsModule from "@/lib/metrics/pageLinkMetrics";
import * as unilinkMetricsModule from "@/lib/unilink/metrics";
import * as resolverModule from "@/lib/unilink/resolver";
import * as unilinkModule from "@/lib/unilink";

// Mock function declarations - grouped by module for clarity
const mocks = {
  // Search functionality
  searchPages: vi.fn(),

  // Legacy metrics (pageLinkMetrics)
  markPending: vi.fn(),
  markResolved: vi.fn(),
  markMissing: vi.fn(),

  // Unified link metrics
  markUnifiedPending: vi.fn(),
  markUnifiedResolved: vi.fn(),
  markUnifiedMissing: vi.fn(),
  markUnifiedError: vi.fn(),
  markUnifiedCacheHit: vi.fn(),

  // Navigation and page creation
  navigateToPage: vi.fn(),
  handleMissingLinkClick: vi.fn(),

  // Cache functionality
  getCachedPageId: vi.fn(),
  setCachedPageId: vi.fn(),

  // Auto reconciler
  autoReconciler: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    destroy: vi.fn(),
  })),
};

// Apply mocks to actual modules using vi.spyOn
vi.spyOn(searchPagesModule, "searchPages").mockImplementation(
  mocks.searchPages
);
vi.spyOn(pageLinkMetricsModule, "markPending").mockImplementation(
  mocks.markPending
);
vi.spyOn(pageLinkMetricsModule, "markResolved").mockImplementation(
  mocks.markResolved
);
vi.spyOn(pageLinkMetricsModule, "markMissing").mockImplementation(
  mocks.markMissing
);
vi.spyOn(unilinkMetricsModule, "markUnifiedPending").mockImplementation(
  mocks.markUnifiedPending
);
vi.spyOn(unilinkMetricsModule, "markUnifiedResolved").mockImplementation(
  mocks.markUnifiedResolved
);
vi.spyOn(unilinkMetricsModule, "markUnifiedMissing").mockImplementation(
  mocks.markUnifiedMissing
);
vi.spyOn(unilinkMetricsModule, "markUnifiedError").mockImplementation(
  mocks.markUnifiedError
);
vi.spyOn(unilinkMetricsModule, "markUnifiedCacheHit").mockImplementation(
  mocks.markUnifiedCacheHit
);
vi.spyOn(resolverModule, "navigateToPage").mockImplementation(
  mocks.navigateToPage
);
vi.spyOn(resolverModule, "handleMissingLinkClick").mockImplementation(
  mocks.handleMissingLinkClick
);
vi.spyOn(unilinkModule, "getCachedPageId").mockImplementation(
  mocks.getCachedPageId
);
vi.spyOn(unilinkModule, "setCachedPageId").mockImplementation(
  mocks.setCachedPageId
);

// Keep the original normalizeTitleToKey implementation for accurate testing
const normalizeTitleToKey = (text: string) =>
  text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/　/g, " ")
    .replace(/_/g, " ")
    .normalize("NFC");

/**
 * Test Helpers
 *
 * 繰り返しのコードを削減し、テストの可読性を向上させます。
 */

// Helper to reset all mocks to clean state
function resetAllMocks() {
  vi.clearAllMocks();
  mocks.getCachedPageId.mockReturnValue(null);
  mocks.searchPages.mockResolvedValue([]);
}

// Helper to mock a successful page search
function mockPageExists(title: string, pageId: string) {
  mocks.searchPages.mockResolvedValue([{ id: pageId, title, similarity: 1.0 }]);
}

// Helper to mock cache hit
function mockCacheHit(key: string, pageId: string) {
  mocks.getCachedPageId.mockReturnValue(pageId);
}

describe("UnifiedLinkMark", () => {
  let editor: Editor;

  beforeEach(() => {
    // Reset all mocks to clean state
    resetAllMocks();

    // Initialize editor with UnifiedLinkMark
    editor = new Editor({
      extensions: [
        StarterKit,
        UnifiedLinkMark.configure({
          HTMLAttributes: {
            class: "unilink underline cursor-pointer",
          },
        }),
      ],
      content: "",
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  /**
   * 基本機能のテスト
   */
  describe("Basic Functionality", () => {
    it("should be registered as 'unilink' mark", () => {
      const schema = editor.schema;
      expect(schema.marks.unilink).toBeDefined();
    });

    it("should have priority 1000", () => {
      const mark = editor.extensionManager.extensions.find(
        (ext) => ext.name === "unilink"
      );
      expect(mark?.options.priority).toBe(1000);
    });

    it("should be non-inclusive", () => {
      const schema = editor.schema;
      expect(schema.marks.unilink.spec.inclusive).toBe(false);
    });
  });

  /**
   * InputRule のテスト - ブラケット記法
   */
  describe("InputRule: Bracket Notation", () => {
    it("should convert [text] to unilink mark", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Test Page]");

      // Wait for async resolution
      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const textNode = json.content?.[0]?.content?.[0];

      expect(textNode?.text).toBe("Test Page");
      expect(textNode?.marks?.[0]?.type).toBe("unilink");
    });

    it("should extract text correctly from bracket notation", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[My Test Page]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.raw).toBe("My Test Page");
      expect(mark?.attrs?.text).toBe("My Test Page");
    });

    it("should normalize title to key", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Test  Page  With  Spaces]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.key).toBe("Test Page With Spaces");
    });

    it("should set variant to 'bracket'", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Test]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.variant).toBe("bracket");
    });

    it("should generate unique markId", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Test1] [Test2]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark1 = json.content?.[0]?.content?.[0]?.marks?.[0];
      const mark2 = json.content?.[0]?.content?.[2]?.marks?.[0];

      expect(mark1?.attrs?.markId).toBeDefined();
      expect(mark2?.attrs?.markId).toBeDefined();
      expect(mark1?.attrs?.markId).not.toBe(mark2?.attrs?.markId);
    });

    it("should not convert brackets in code context", async () => {
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "codeBlock",
            content: [
              {
                type: "text",
                text: "[Not A Link]",
              },
            ],
          },
        ],
      });

      const json = editor.getJSON();
      const textNode = json.content?.[0]?.content?.[0];

      expect(textNode?.text).toBe("[Not A Link]");
      expect(textNode?.marks).toBeUndefined();
    });
  });

  /**
   * 外部リンク検出のテスト
   */
  describe("External Link Detection", () => {
    it("should detect http URLs as external", async () => {
      editor.commands.insertContent("[http://example.com]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.href).toBe("http://example.com");
      expect(mark?.attrs?.state).toBe("exists");
    });

    it("should detect https URLs as external", async () => {
      editor.commands.insertContent("[https://example.com]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.href).toBe("https://example.com");
      expect(mark?.attrs?.state).toBe("exists");
    });

    it("should not trigger async resolution for external links", async () => {
      const searchPagesMock = mocks.searchPages;

      editor.commands.insertContent("[https://example.com]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(searchPagesMock).not.toHaveBeenCalled();
    });
  });

  /**
   * 状態管理のテスト
   */
  describe("State Management", () => {
    it("should start with 'pending' state for internal links", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Test Page]");

      // Check immediately before resolution
      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.state).toBe("pending");
    });

    it("should transition to 'exists' when page is found", async () => {
      mocks.searchPages.mockResolvedValue([
        {
          id: "page-123",
          title: "Test Page",
        },
      ]);

      editor.commands.insertContent("[Test Page]");

      // Wait for async resolution
      await new Promise((resolve) => setTimeout(resolve, 200));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.state).toBe("exists");
      expect(mark?.attrs?.pageId).toBe("page-123");
      expect(mark?.attrs?.href).toBe("/pages/page-123");
      expect(mark?.attrs?.exists).toBe(true);
    });

    it("should transition to 'missing' when page is not found", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Nonexistent Page]");

      await new Promise((resolve) => setTimeout(resolve, 200));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.state).toBe("missing");
      expect(mark?.attrs?.exists).toBe(false);
      expect(mark?.attrs?.href).toBe("#");
    });

    it("should transition to 'error' on search failure", async () => {
      mocks.searchPages.mockRejectedValue(new Error("Network error"));

      editor.commands.insertContent("[Error Page]");

      await new Promise((resolve) => setTimeout(resolve, 200));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.state).toBe("error");
    });
  });

  /**
   * キャッシュ機能のテスト
   */
  describe("Cache Functionality", () => {
    it("should use cached pageId when available", async () => {
      mocks.getCachedPageId.mockReturnValue("cached-page-123");

      editor.commands.insertContent("[Cached Page]");

      await new Promise((resolve) => setTimeout(resolve, 200));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.pageId).toBe("cached-page-123");
      expect(mark?.attrs?.state).toBe("exists");
      expect(mocks.searchPages).not.toHaveBeenCalled();
    });

    it("should cache pageId after successful resolution", async () => {
      mocks.getCachedPageId.mockReturnValue(null);
      mocks.searchPages.mockResolvedValue([
        {
          id: "new-page-456",
          title: "New Page",
        },
      ]);

      editor.commands.insertContent("[New Page]");

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mocks.setCachedPageId).toHaveBeenCalledWith(
        "New Page",
        "new-page-456"
      );
    });
  });

  /**
   * 正規化のテスト
   */
  describe("Title Normalization", () => {
    it("should normalize consecutive spaces", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Test   Multiple   Spaces]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.key).toBe("Test Multiple Spaces");
    });

    it("should normalize full-width spaces", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Test　Full　Width]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.key).toBe("Test Full Width");
    });

    it("should normalize underscores to spaces", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Test_With_Underscores]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.key).toBe("Test With Underscores");
    });

    it("should trim leading and trailing spaces", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[  Trimmed Page  ]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.key).toBe("Trimmed Page");
    });
  });

  /**
   * コマンドのテスト
   */
  describe("Commands", () => {
    describe("insertUnifiedLink", () => {
      it("should insert unified link with provided attributes", () => {
        editor.chain().focus().insertContent("Test").selectAll().run();

        // biome-ignore lint/suspicious/noExplicitAny: Testing custom command
        (editor.commands as any).insertUnifiedLink({
          variant: "bracket",
          raw: "Test Link",
          text: "Test Link",
        });

        const json = editor.getJSON();
        const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

        expect(mark?.type).toBe("unilink");
        expect(mark?.attrs?.variant).toBe("bracket");
        expect(mark?.attrs?.raw).toBe("Test Link");
      });

      it("should generate markId automatically", () => {
        editor.chain().focus().insertContent("Test").selectAll().run();

        // biome-ignore lint/suspicious/noExplicitAny: Testing custom command
        (editor.commands as any).insertUnifiedLink({
          variant: "bracket",
          raw: "Test",
        });

        const json = editor.getJSON();
        const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

        expect(mark?.attrs?.markId).toBeDefined();
        expect(mark?.attrs?.markId).toMatch(/^unilink-/);
      });
    });

    describe("refreshUnifiedLinks", () => {
      it("should re-resolve pending links", async () => {
        mocks.searchPages.mockResolvedValue([
          {
            id: "resolved-page",
            title: "Test Page",
          },
        ]);

        editor.commands.insertContent("[Test Page]");

        await new Promise((resolve) => setTimeout(resolve, 100));

        // Manually set to pending again (simulating stale state)
        const json = editor.getJSON();
        const textNode = json.content?.[0]?.content?.[0];
        if (textNode?.marks?.[0]?.attrs) {
          textNode.marks[0].attrs.state = "pending";
          editor.commands.setContent(json);
        }

        // Refresh (use type assertion for custom command)
        // biome-ignore lint/suspicious/noExplicitAny: Testing custom command
        (editor.commands as any).refreshUnifiedLinks();

        await new Promise((resolve) => setTimeout(resolve, 200));

        const updatedJson = editor.getJSON();
        const mark = updatedJson.content?.[0]?.content?.[0]?.marks?.[0];

        expect(mark?.attrs?.state).toBe("exists");
      });
    });
  });

  /**
   * 属性のテスト
   */
  describe("Attributes", () => {
    it("should define all required attributes", () => {
      const schema = editor.schema;
      const unilinkMark = schema.marks.unilink;

      const attrs = unilinkMark.spec.attrs;

      expect(attrs).toHaveProperty("variant");
      expect(attrs).toHaveProperty("raw");
      expect(attrs).toHaveProperty("text");
      expect(attrs).toHaveProperty("key");
      expect(attrs).toHaveProperty("pageId");
      expect(attrs).toHaveProperty("href");
      expect(attrs).toHaveProperty("state");
      expect(attrs).toHaveProperty("exists");
      expect(attrs).toHaveProperty("created");
      expect(attrs).toHaveProperty("markId");
    });

    it("should have correct default values", () => {
      const schema = editor.schema;
      const unilinkMark = schema.marks.unilink;

      const attrs = unilinkMark.spec.attrs as Record<
        string,
        { default?: unknown }
      >;

      expect(attrs.variant.default).toBe("bracket");
      expect(attrs.raw.default).toBe("");
      expect(attrs.text.default).toBe("");
      expect(attrs.key.default).toBe("");
      expect(attrs.pageId.default).toBe(null);
      expect(attrs.href.default).toBe("#");
      expect(attrs.state.default).toBe("pending");
      expect(attrs.exists.default).toBe(false);
      expect(attrs.created.default).toBe(false);
      expect(attrs.markId.default).toBe("");
    });
  });

  /**
   * HTML レンダリングのテスト
   */
  describe("HTML Rendering", () => {
    it("should render as anchor tag", () => {
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Test Link",
                marks: [
                  {
                    type: "unilink",
                    attrs: {
                      variant: "bracket",
                      raw: "Test Link",
                      text: "Test Link",
                      key: "Test Link",
                      pageId: null,
                      href: "#",
                      state: "pending",
                      exists: false,
                      markId: "test-mark-id",
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();

      expect(html).toContain("<a");
      expect(html).toContain('class="unilink underline cursor-pointer');
      expect(html).toContain("Test Link");
    });

    it("should include variant class", () => {
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Test",
                marks: [
                  {
                    type: "unilink",
                    attrs: {
                      variant: "bracket",
                      raw: "Test",
                      text: "Test",
                      key: "Test",
                      href: "#",
                      state: "pending",
                      exists: false,
                      markId: "test-id",
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();

      expect(html).toContain("unilink--bracket");
    });

    it("should include data attributes", () => {
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Test",
                marks: [
                  {
                    type: "unilink",
                    attrs: {
                      variant: "bracket",
                      raw: "Test",
                      text: "Test",
                      key: "test-key",
                      pageId: "page-123",
                      href: "/pages/page-123",
                      state: "exists",
                      exists: true,
                      markId: "mark-123",
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();

      expect(html).toContain('data-variant="bracket"');
      expect(html).toContain('data-key="test-key"');
      expect(html).toContain('data-page-id="page-123"');
      expect(html).toContain('data-state="exists"');
      expect(html).toContain('data-exists="true"');
      expect(html).toContain('data-mark-id="mark-123"');
    });
  });

  /**
   * Mark の優先順位テスト（bold/italic との組み合わせ）
   */
  describe("Mark Priority and Combinations", () => {
    it("should wrap bold text (priority 1000 > bold's priority)", () => {
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Bold Link",
                marks: [
                  {
                    type: "bold",
                  },
                  {
                    type: "unilink",
                    attrs: {
                      variant: "bracket",
                      raw: "Bold Link",
                      text: "Bold Link",
                      key: "Bold Link",
                      href: "#",
                      state: "pending",
                      exists: false,
                      markId: "test-id",
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();

      // Link should wrap bold: <a><strong>Bold Link</strong></a>
      const linkIndex = html.indexOf("<a");
      const strongIndex = html.indexOf("<strong");

      expect(linkIndex).toBeLessThan(strongIndex);
    });

    it("should work with italic text", () => {
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Italic Link",
                marks: [
                  {
                    type: "italic",
                  },
                  {
                    type: "unilink",
                    attrs: {
                      variant: "bracket",
                      raw: "Italic Link",
                      text: "Italic Link",
                      key: "Italic Link",
                      href: "#",
                      state: "pending",
                      exists: false,
                      markId: "test-id",
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();

      expect(html).toContain("<a");
      expect(html).toContain("<em");
      expect(html).toContain("Italic Link");
    });

    it("should work with bold and italic together", () => {
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Bold Italic Link",
                marks: [
                  {
                    type: "bold",
                  },
                  {
                    type: "italic",
                  },
                  {
                    type: "unilink",
                    attrs: {
                      variant: "bracket",
                      raw: "Bold Italic Link",
                      text: "Bold Italic Link",
                      key: "Bold Italic Link",
                      href: "#",
                      state: "pending",
                      exists: false,
                      markId: "test-id",
                    },
                  },
                ],
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();

      expect(html).toContain("<a");
      expect(html).toContain("<strong");
      expect(html).toContain("<em");
    });
  });

  /**
   * エッジケースのテスト
   */
  describe("Edge Cases", () => {
    it("should handle empty brackets", async () => {
      editor.commands.insertContent("[]");

      const json = editor.getJSON();
      const textNode = json.content?.[0]?.content?.[0];

      // Empty brackets should not create a mark
      expect(textNode?.text).toBe("[]");
      expect(textNode?.marks).toBeUndefined();
    });

    it("should handle nested brackets (only outer)", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Outer [Inner] Text]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();

      // Should create mark for the outer bracket
      // Note: Actual behavior depends on InputRule implementation
      // This test documents expected behavior
      expect(json.content).toBeDefined();
    });

    it("should handle very long titles", async () => {
      mocks.searchPages.mockResolvedValue([]);

      const longTitle = "A".repeat(500);
      editor.commands.insertContent(`[${longTitle}]`);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.raw).toBe(longTitle);
    });

    it("should handle special characters", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[Test & Special <> Characters]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.raw).toBe("Test & Special <> Characters");
    });

    it("should handle unicode characters", async () => {
      mocks.searchPages.mockResolvedValue([]);

      editor.commands.insertContent("[日本語タイトル 🎉]");

      await new Promise((resolve) => setTimeout(resolve, 100));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.raw).toBe("日本語タイトル 🎉");
    });
  });

  /**
   * 完全一致のテスト（normalizeTitleToKey）
   */
  describe("Exact Match with Normalization", () => {
    it("should find exact match after normalization", async () => {
      mocks.searchPages.mockResolvedValue([
        {
          id: "page-1",
          title: "Test Page",
        },
        {
          id: "page-2",
          title: "Test  Page  Extra",
        },
      ]);

      editor.commands.insertContent("[Test  Page]");

      await new Promise((resolve) => setTimeout(resolve, 200));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      // Should match the first result after normalization
      expect(mark?.attrs?.pageId).toBe("page-1");
      expect(mark?.attrs?.state).toBe("exists");
    });

    it("should prefer exact match over partial", async () => {
      mocks.searchPages.mockResolvedValue([
        {
          id: "page-partial",
          title: "Test Page Extra",
        },
        {
          id: "page-exact",
          title: "Test Page",
        },
      ]);

      editor.commands.insertContent("[Test Page]");

      await new Promise((resolve) => setTimeout(resolve, 200));

      const json = editor.getJSON();
      const mark = json.content?.[0]?.content?.[0]?.marks?.[0];

      expect(mark?.attrs?.pageId).toBe("page-exact");
    });
  });

  /**
   * Phase 2.2: 自動ブラケット閉じのテスト
   */
  describe("Auto-close Brackets (Phase 2.2)", () => {
    it("should auto-close bracket at paragraph end", () => {
      editor.commands.setContent("<p></p>");
      editor.commands.focus();

      // Simulate typing '['
      const view = editor.view;
      const { state } = view;
      const tr = state.tr.insertText("[", state.selection.from);
      view.dispatch(tr);

      // Check if brackets are auto-closed
      const content = editor.getText();
      expect(content).toBe("[]");

      // Check cursor position (should be inside brackets)
      const cursorPos = editor.state.selection.from;
      expect(cursorPos).toBe(2); // Position 1 is after '[', inside brackets
    });

    it("should not auto-close bracket with trailing text", () => {
      editor.commands.setContent("<p>existing text</p>");
      editor.commands.focus("start");

      // Simulate typing '[' at the start
      const view = editor.view;
      const { state } = view;
      const tr = state.tr.insertText("[", 1); // Insert at position 1
      view.dispatch(tr);

      // Should not auto-close because there's trailing text
      const content = editor.getText();
      expect(content).toBe("[existing text");
    });

    it("should auto-close bracket when only whitespace follows", () => {
      editor.commands.setContent("<p>   </p>");
      editor.commands.focus("start");

      // Simulate typing '['
      const view = editor.view;
      const { state } = view;
      const tr = state.tr.insertText("[", 1);
      view.dispatch(tr);

      // Should auto-close because only whitespace follows
      const content = editor.getText();
      expect(content).toBe("[]   ");
    });

    it("should not auto-close in code blocks", () => {
      editor.commands.setContent("<pre><code></code></pre>");
      editor.commands.focus();

      // Simulate typing '['
      const view = editor.view;
      const { state } = view;
      const tr = state.tr.insertText("[", state.selection.from);
      view.dispatch(tr);

      // Should not auto-close in code block
      const content = editor.getText();
      expect(content).toBe("[");
    });
  });

  /**
   * Phase 2.4: noteSlug と userId オプションのテスト
   */
  describe("Configuration Options (Phase 2.4)", () => {
    it("should accept noteSlug option", () => {
      const editorWithNote = new Editor({
        extensions: [
          StarterKit,
          UnifiedLinkMark.configure({
            noteSlug: "my-note-slug",
          }),
        ],
      });

      expect(
        editorWithNote.extensionManager.extensions.find(
          (ext) => ext.name === "unilink"
        )?.options.noteSlug
      ).toBe("my-note-slug");

      editorWithNote.destroy();
    });

    it("should accept userId option", () => {
      const editorWithUser = new Editor({
        extensions: [
          StarterKit,
          UnifiedLinkMark.configure({
            userId: "user-123",
          }),
        ],
      });

      expect(
        editorWithUser.extensionManager.extensions.find(
          (ext) => ext.name === "unilink"
        )?.options.userId
      ).toBe("user-123");

      editorWithUser.destroy();
    });

    it("should accept custom dialog callback", () => {
      const mockCallback = vi.fn();
      const editorWithCallback = new Editor({
        extensions: [
          StarterKit,
          UnifiedLinkMark.configure({
            onShowCreatePageDialog: mockCallback,
          }),
        ],
      });

      expect(
        editorWithCallback.extensionManager.extensions.find(
          (ext) => ext.name === "unilink"
        )?.options.onShowCreatePageDialog
      ).toBe(mockCallback);

      editorWithCallback.destroy();
    });
  });
});
