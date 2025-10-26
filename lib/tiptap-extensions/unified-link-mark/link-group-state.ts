/**
 * Link Group State Management
 * Utility functions for determining link group state
 */

/**
 * Determine link group state based on page existence and link count
 *
 * @param pageId - Page ID (null if page doesn't exist)
 * @param linkCount - Number of links in the same group
 * @returns Link group state: 'exists', 'grouped', or 'missing'
 *
 * Rules:
 * - exists: Page exists (pageId is set)
 * - grouped: Page doesn't exist but multiple links with same text exist (linkCount > 1)
 * - missing: Page doesn't exist and link text is unique (linkCount <= 1)
 */
export function determineLinkGroupState(
	pageId: string | null | undefined,
	linkCount: number,
): "exists" | "grouped" | "missing" {
	// If page exists, state is 'exists'
	if (pageId) {
		return "exists";
	}

	// If page doesn't exist but multiple links with same text exist, state is 'grouped'
	if (linkCount > 1) {
		return "grouped";
	}

	// Otherwise, state is 'missing'
	return "missing";
}

/**
 * Check if link should be displayed as a regular link (blue color)
 *
 * @param groupState - Link group state
 * @returns True if link should be displayed as regular link (blue)
 */
export function shouldDisplayAsRegularLink(
	groupState: "exists" | "grouped" | "missing",
): boolean {
	return groupState === "exists" || groupState === "grouped";
}

/**
 * Get CSS class for link group state
 *
 * @param groupState - Link group state
 * @returns CSS class name for the state
 */
export function getLinkGroupStateClass(
	groupState: "exists" | "grouped" | "missing",
): string {
	return `unilink--${groupState}`;
}
