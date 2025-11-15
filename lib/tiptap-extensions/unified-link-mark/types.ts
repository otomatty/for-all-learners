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
	/**
	 * Callback function to show a confirmation dialog when creating a new page from an unset link.
	 *
	 * @param title - The title of the page to be created
	 * @param onConfirm - Async callback function to execute when the user confirms page creation.
	 *                   This callback should handle the actual page creation logic.
	 */
	onShowCreatePageDialog?: (
		title: string,
		onConfirm: () => Promise<void>,
	) => void;
	/**
	 * Callback function for client-side navigation.
	 * If provided, this will be used instead of window.location.href for better UX.
	 * Phase 2: Client-side navigation improvement
	 *
	 * @param href - The URL to navigate to
	 */
	onNavigate?: (href: string) => void;
}

/**
 * Mark attributes interface
 * Extended in Phase 3.1 to support icon links and external links
 * Extended in Phase 1 (Link Group) to support link group state
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

	// Phase 1 (Link Group): New fields for link group functionality
	linkGroupId?: string | null; // Link group ID from link_groups table
	groupState?: "exists" | "grouped" | "missing"; // Link group state
	linkCount?: number; // Number of links in the same group
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
	pos?: number; // Position in the document
}
