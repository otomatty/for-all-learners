/**
 * Navigation Utilities
 * Handles page navigation with context awareness
 */

import { toast } from "sonner";

/**
 * Navigate to a specific page by ID
 * Simple navigation to /pages/:id
 *
 * @param pageId Page ID to navigate to
 */
export function navigateToPage(pageId: string): void {
  try {
    // Client-side navigation in Next.js App Router
    if (typeof window !== "undefined") {
      window.location.href = `/pages/${pageId}`;
    }
  } catch (error) {
    console.error("Navigation failed:", error);
    toast.error("ページの表示に失敗しました");
  }
}

/**
 * Navigate to page with context awareness
 * Supports note context: /notes/:slug/:id or /pages/:id
 * Phase 3.1: Unified navigation considering noteSlug
 *
 * @param pageId Page ID to navigate to
 * @param noteSlug Optional note slug for context-aware URL
 * @param isNewPage Flag indicating if this is a newly created page
 */
export function navigateToPageWithContext(
  pageId: string,
  noteSlug?: string | null,
  isNewPage = false
): void {
  try {
    if (typeof window !== "undefined") {
      const queryParam = isNewPage ? "?newPage=true" : "";

      const href = noteSlug
        ? `/notes/${encodeURIComponent(noteSlug)}/${pageId}${queryParam}`
        : `/pages/${pageId}${queryParam}`;

      window.location.href = href;
    }
  } catch (error) {
    console.error("[UnifiedResolver] Navigation failed:", error);
    toast.error("ページの表示に失敗しました");
  }
}
