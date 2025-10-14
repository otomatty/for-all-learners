/**
 * UnifiedLinkMark type definitions
 * All type definitions for the UnifiedLinkMark extension
 */

import type { Editor } from "@tiptap/core";
import type { AutoReconciler } from "../../unilink";

/**
 * Link type classification
 * - page: Regular page link [Title]
 * - tag: Tag link #tag
 * - icon: User icon link [username.icon]
 * - external: External URL [https://...]
 */
export type LinkType = "page" | "tag" | "icon" | "external";

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
		onConfirm: () => Promise<void>,
	) => void;
}

/**
 * Mark attributes interface
 * Extended in Phase 3.1 to support icon links and external links
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

	// Phase 3.1: New fields for link type classification
	linkType?: LinkType; // Link type (optional for backward compatibility)
	userSlug?: string; // User slug for .icon links (e.g., "username" from "username.icon")
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
	raw: string; // Original text before normalization
	markId: string;
	editor: Editor;
	variant?: "bracket" | "tag";
}
