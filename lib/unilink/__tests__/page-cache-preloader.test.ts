/**
 * Tests for page cache preloader
 * Tests cache preloading and cross-page link resolution
 */

import { beforeEach, describe, expect, it } from "vitest";
import { clearCache, getCachedPageId, setCachedPageIds } from "../utils";
import { addPageToCache } from "../page-cache-preloader";

describe("page-cache-preloader", () => {
  beforeEach(() => {
    clearCache();
  });

  describe("setCachedPageIds (bulk preload)", () => {
    it("should preload multiple page titles into cache", () => {
      const pages = [
        { key: "Test Page 1", pageId: "page1" },
        { key: "Test Page 2", pageId: "page2" },
        { key: "Another Page", pageId: "page3" },
      ];

      setCachedPageIds(pages);

      // Verify cache entries
      expect(getCachedPageId("Test Page 1")).toBe("page1");
      expect(getCachedPageId("Test Page 2")).toBe("page2");
      expect(getCachedPageId("Another Page")).toBe("page3");
    });

    it("should handle normalized keys", () => {
      const pages = [
        { key: "test page 1", pageId: "page1" },
        { key: "test page 2", pageId: "page2" },
      ];

      setCachedPageIds(pages);

      // Both exact and normalized keys should work
      expect(getCachedPageId("test page 1")).toBe("page1");
      expect(getCachedPageId("test page 2")).toBe("page2");
    });
  });

  describe("addPageToCache", () => {
    it("should add a single page to cache with normalized key", () => {
      addPageToCache("new-page", "New Page Title");

      // The key is normalized internally (case is preserved)
      expect(getCachedPageId("New Page Title")).toBe("new-page");
    });

    it("should normalize whitespace when storing", () => {
      // Add page with extra whitespace
      addPageToCache("new-page", "  New   Page   Title  ");

      // Should be retrievable with normalized whitespace
      expect(getCachedPageId("New Page Title")).toBe("new-page");

      // Original with whitespace should also work (gets normalized on lookup)
      expect(getCachedPageId("  New   Page   Title  ")).toBe("new-page");
    });

    it("should update existing cache entry", () => {
      addPageToCache("page1", "Original Title");
      expect(getCachedPageId("Original Title")).toBe("page1");

      // Update with new title
      addPageToCache("page1", "Updated Title");
      expect(getCachedPageId("Updated Title")).toBe("page1");
    });
  });

  describe("cross-page link resolution", () => {
    it("should enable cross-page link resolution through shared cache", () => {
      // Simulate preloading pages from multiple sources
      setCachedPageIds([
        { key: "Page A", pageId: "page-a" },
        { key: "Page B", pageId: "page-b" },
        { key: "Page C", pageId: "page-c" },
      ]);

      // Simulate a link on Page A trying to resolve a title from Page B
      const resolvedPageId = getCachedPageId("Page B");

      expect(resolvedPageId).toBe("page-b");
    });

    it("should immediately recognize newly created pages", () => {
      // Preload existing pages
      setCachedPageIds([
        { key: "Existing Page 1", pageId: "existing-1" },
        { key: "Existing Page 2", pageId: "existing-2" },
      ]);

      // Simulate new page creation
      addPageToCache("new-page-id", "Brand New Page");

      // This should be immediately available in cache
      expect(getCachedPageId("Brand New Page")).toBe("new-page-id");
    });

    it("should allow multiple editors to share link information", () => {
      // Editor 1: Creates initial cache
      setCachedPageIds([{ key: "Shared Page", pageId: "shared-1" }]);

      // Editor 2: Should be able to access the same cache
      expect(getCachedPageId("Shared Page")).toBe("shared-1");

      // Editor 1: Adds a new page
      addPageToCache("shared-2", "Another Shared Page");

      // Editor 2: Should immediately see the new page
      expect(getCachedPageId("Another Shared Page")).toBe("shared-2");
    });
  });
});
