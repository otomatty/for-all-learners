/**
 * UnifiedLinkMark type definitions
 * All type definitions for the UnifiedLinkMark extension
 */

import type { Editor } from "@tiptap/core";
import type { AutoReconciler } from "../../unilink";

/**
 * Mark options interface
 */
export interface UnifiedLinkMarkOptions {
  HTMLAttributes: Record<string, string>;
  autoReconciler?: AutoReconciler | null;
  noteSlug?: string | null;
  userId?: string | null;
  onShowCreatePageDialog?: (
    title: string,
    onConfirm: () => Promise<void>
  ) => void;
}

/**
 * Mark attributes interface
 */
export interface UnifiedLinkAttributes {
  variant: "bracket" | "tag";
  raw: string;
  text: string;
  key: string;
  pageId?: string | null;
  href: string;
  state: "pending" | "exists" | "missing" | "error";
  exists: boolean;
  created?: boolean;
  meta?: object;
  markId: string;
}

/**
 * Search result interface
 */
export interface SearchResult {
  id: string;
  title: string;
  similarity?: number;
}

/**
 * Resolver queue item interface
 */
export interface ResolverQueueItem {
  key: string;
  markId: string;
  editor: Editor;
  variant?: "bracket" | "tag";
}
