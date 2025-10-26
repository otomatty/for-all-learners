/**
 * Link State Determination Utility
 * Determines the display state of a UnifiedLinkMark based on page existence and link count
 *
 * Related Documentation:
 * - Spec: docs/01_issues/open/2025_10/20251026_01_link-group-and-network-feature.md
 * - Phase: Phase 1 - Link Group Foundation
 */

/**
 * Link group state
 * - exists: Link target page exists
 * - grouped: Link target page does not exist, but multiple links with same key exist (link group)
 * - missing: Link target page does not exist and only one link with this key exists
 */
export type LinkGroupState = "exists" | "grouped" | "missing";

/**
 * Determine the link state based on page existence and link count
 *
 * Display rules:
 * 1. If pageId exists → 'exists' (normal link color, links to the page)
 * 2. If pageId is null but linkCount > 1 → 'grouped' (normal link color, shows link group)
 * 3. If pageId is null and linkCount === 1 → 'missing' (gray color, shows create page dialog)
 *
 * @param pageId - Page ID if link target exists, null otherwise
 * @param linkCount - Number of links with the same key across all pages
 * @returns Link group state
 *
 * @example
 * determineLinkState('page-123', 5) // 'exists'
 * determineLinkState(null, 5) // 'grouped'
 * determineLinkState(null, 1) // 'missing'
 */
export function determineLinkState(
	pageId: string | null | undefined,
	linkCount: number,
): LinkGroupState {
	// Rule 1: Page exists
	if (pageId) {
		return "exists";
	}

	// Rule 2: Page doesn't exist, but multiple links exist (link group)
	if (linkCount > 1) {
		return "grouped";
	}

	// Rule 3: Page doesn't exist and only one link exists
	return "missing";
}

/**
 * Determine CSS class based on link group state
 *
 * @param groupState - Link group state
 * @returns CSS class name
 *
 * @example
 * getLinkStateClassName('exists') // 'link-exists'
 * getLinkStateClassName('grouped') // 'link-grouped'
 * getLinkStateClassName('missing') // 'link-missing'
 */
export function getLinkStateClassName(groupState: LinkGroupState): string {
	return `link-${groupState}`;
}

/**
 * Check if a link should be styled as a normal link (blue color)
 *
 * @param groupState - Link group state
 * @returns true if link should use normal link color
 */
export function isNormalLinkStyle(groupState: LinkGroupState): boolean {
	return groupState === "exists" || groupState === "grouped";
}
