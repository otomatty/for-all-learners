/**
 * Link Type Handling
 * Determines and processes different types of links (page, icon, external)
 * Phase 3.1: Icon link and external link support
 */

import { toast } from "sonner";
import type { Editor } from "@tiptap/core";
import { navigateToPage } from "./navigation";

/**
 * Bracket content parsing result
 */
export interface BracketContent {
  type: "page" | "icon" | "external";
  slug: string;
  isIcon: boolean;
  userSlug?: string;
}

/**
 * Resolve .icon notation user links
 * [username.icon] → Navigate to user page
 *
 * @param userSlug User slug (e.g., "username" from "username.icon")
 * @param noteSlug Optional note slug for note context display
 * @returns Page ID and href, or null if not found
 */
export async function resolveIconLink(
  userSlug: string,
  noteSlug?: string | null
): Promise<{ pageId: string; href: string } | null> {
  try {
    console.log(`[UnifiedResolver] Resolving icon link: ${userSlug}`);

    // Dynamic import to avoid circular dependency
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    // 1. Search accounts table by user_slug
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_slug", userSlug)
      .single();

    if (accountError || !account) {
      console.warn(`[UnifiedResolver] User not found: ${userSlug}`);
      toast.error(`ユーザー "${userSlug}" が見つかりません`);
      return null;
    }

    // 2. Get user page from pages table
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id")
      .eq("user_id", account.id)
      .eq("title", userSlug)
      .single();

    if (pageError || !page) {
      console.warn(`[UnifiedResolver] User page not found for: ${userSlug}`);
      toast.error("ユーザーページが見つかりません");
      return null;
    }

    // 3. Generate URL based on noteSlug
    const href = noteSlug
      ? `/notes/${encodeURIComponent(noteSlug)}/${page.id}`
      : `/pages/${page.id}`;

    console.log(`[UnifiedResolver] Icon link resolved: ${href}`);
    return { pageId: page.id, href };
  } catch (error) {
    console.error("[UnifiedResolver] Icon link resolution failed:", error);
    toast.error("ページ遷移に失敗しました");
    return null;
  }
}

/**
 * Parse bracket content and determine link type
 * Phase 3.1: Detection of .icon suffix and external links
 *
 * @param content Text inside brackets (e.g., "Page Title", "username.icon", "https://...")
 * @returns Link type information
 */
export function parseBracketContent(content: string): BracketContent {
  // Detect .icon suffix
  const iconMatch = content.match(/^(.+)\.icon$/);
  if (iconMatch) {
    return {
      type: "icon",
      slug: iconMatch[1],
      isIcon: true,
      userSlug: iconMatch[1],
    };
  }

  // Detect external links (https:// or http://)
  if (/^https?:\/\//i.test(content)) {
    return {
      type: "external",
      slug: content,
      isIcon: false,
    };
  }

  // Regular page link
  return {
    type: "page",
    slug: content,
    isIcon: false,
  };
}

/**
 * Check if text is an external link
 *
 * @param text Text to check
 * @returns true if external link
 */
export function isExternalLink(text: string): boolean {
  return /^https?:\/\//i.test(text);
}

/**
 * Open external link in new tab
 * Adds noopener and noreferrer attributes for security
 *
 * @param url External URL
 */
export function openExternalLink(url: string): void {
  try {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    console.error("[UnifiedResolver] Failed to open external link:", error);
    toast.error("リンクを開けませんでした");
  }
}

/**
 * Handle missing link click
 * Dialog display is delegated to callback, resolver layer only provides logic
 *
 * @param editor TipTap editor instance
 * @param markId Target mark ID
 * @param title Page title
 * @param userId User ID
 * @param onShowDialog Optional dialog display callback
 */
export async function handleMissingLinkClick(
  editor: Editor,
  markId: string,
  title: string,
  userId?: string,
  onShowDialog?: (title: string, onConfirm: () => Promise<void>) => void
): Promise<void> {
  // Import createPageFromMark dynamically to avoid circular dependency
  const { createPageFromMark } = await import("./page-creation");

  const createAndNavigate = async () => {
    const pageId = await createPageFromMark(editor, markId, title, userId);
    if (pageId) {
      navigateToPage(pageId);
    }
  };

  // Use custom dialog if provided
  if (onShowDialog) {
    onShowDialog(title, createAndNavigate);
  } else {
    // Fallback: Browser confirm dialog
    const confirmed = confirm(
      `「${title}」というページは存在しません。新しく作成しますか？`
    );

    if (confirmed) {
      await createAndNavigate();
    }
  }
}
