/**
 * Telomere Calculator
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ lib/tiptap-extensions/telomere-extension.ts (to be created)
 *
 * Dependencies (External files that this file imports/uses):
 *   └─ None
 *
 * Related Documentation:
 *   ├─ Issue: https://github.com/otomatty/for-all-learners/issues/139
 *   └─ Plan: docs/03_plans/telomere-feature/
 */

/**
 * Time intervals for telomere width calculation (in milliseconds)
 * Based on Cosense (Scrapbox) telomere feature
 * Each interval represents a point where the line width decreases by 1px
 */
const TIME_INTERVALS_MS = [
	0, // 0 hours
	1 * 60 * 60 * 1000, // 1 hour
	2 * 60 * 60 * 1000, // 2 hours
	6 * 60 * 60 * 1000, // 6 hours
	8 * 60 * 60 * 1000, // 8 hours
	12 * 60 * 60 * 1000, // 12 hours
	24 * 60 * 60 * 1000, // 24 hours
	72 * 60 * 60 * 1000, // 72 hours (3 days)
	7 * 24 * 60 * 60 * 1000, // 7 days
	30 * 24 * 60 * 60 * 1000, // 30 days
	60 * 24 * 60 * 60 * 1000, // 60 days
	90 * 24 * 60 * 60 * 1000, // 90 days
	180 * 24 * 60 * 60 * 1000, // 180 days
	365 * 24 * 60 * 60 * 1000, // ~1 year
] as const;

/**
 * Maximum telomere width (in pixels)
 * This is the initial width for newly updated lines
 */
const MAX_TELOMERE_WIDTH = TIME_INTERVALS_MS.length;

/**
 * Minimum telomere width (in pixels)
 * Lines never completely disappear
 */
const MIN_TELOMERE_WIDTH = 1;

/**
 * Calculate telomere width based on elapsed time since last update
 *
 * @param updatedAt - The timestamp when the line was last updated
 * @param now - The current timestamp (defaults to current time)
 * @returns The width in pixels (1 to MAX_TELOMERE_WIDTH)
 *
 * @example
 * ```typescript
 * const updatedAt = new Date('2025-11-15T10:00:00Z');
 * const now = new Date('2025-11-15T12:00:00Z'); // 2 hours later
 * const width = calculateTelomereWidth(updatedAt, now);
 * // Returns: MAX_TELOMERE_WIDTH - 2 (because 2 hours have passed)
 * ```
 */
export function calculateTelomereWidth(
	updatedAt: Date,
	now: Date = new Date(),
): number {
	const elapsed = now.getTime() - updatedAt.getTime();

	// If the line was updated in the future (shouldn't happen, but handle gracefully)
	if (elapsed < 0) {
		return MAX_TELOMERE_WIDTH;
	}

	// Count how many intervals have passed
	let width = MAX_TELOMERE_WIDTH;

	for (const interval of TIME_INTERVALS_MS) {
		if (elapsed >= interval) {
			width--;
		} else {
			break;
		}
	}

	// Ensure minimum width of 1px
	return Math.max(MIN_TELOMERE_WIDTH, width);
}

/**
 * Check if a line is unread (updated after last visit)
 *
 * @param updatedAt - The timestamp when the line was last updated
 * @param lastVisitedAt - The timestamp when the user last visited the page (null if never visited)
 * @returns true if the line was updated after the last visit
 *
 * @example
 * ```typescript
 * const updatedAt = new Date('2025-11-15T12:00:00Z');
 * const lastVisitedAt = new Date('2025-11-15T10:00:00Z');
 * const isUnread = isUnreadLine(updatedAt, lastVisitedAt);
 * // Returns: true (line was updated after last visit)
 * ```
 */
export function isUnreadLine(
	updatedAt: Date,
	lastVisitedAt: Date | null,
): boolean {
	if (!lastVisitedAt) {
		// If never visited, consider all lines as read (no green highlighting)
		return false;
	}

	return updatedAt > lastVisitedAt;
}

/**
 * Parse ISO string or Date to Date object
 * Handles both string and Date inputs for convenience
 *
 * @param date - ISO string or Date object
 * @returns Date object
 */
export function parseDate(date: string | Date): Date {
	if (date instanceof Date) {
		return date;
	}
	return new Date(date);
}

/**
 * Get telomere style properties for a line
 *
 * @param updatedAt - The timestamp when the line was last updated
 * @param lastVisitedAt - The timestamp when the user last visited the page (null if never visited)
 * @param now - The current timestamp (defaults to current time)
 * @returns Object with width and color properties
 *
 * @example
 * ```typescript
 * const style = getTelomereStyle(updatedAt, lastVisitedAt);
 * // Returns: { width: 5, color: 'green' } or { width: 5, color: 'gray' }
 * ```
 */
export function getTelomereStyle(
	updatedAt: string | Date,
	lastVisitedAt: string | Date | null,
	now: Date = new Date(),
): { width: number; color: string } {
	const updatedAtDate = parseDate(updatedAt);
	const lastVisitedAtDate = lastVisitedAt ? parseDate(lastVisitedAt) : null;

	const width = calculateTelomereWidth(updatedAtDate, now);
	const isUnread = isUnreadLine(updatedAtDate, lastVisitedAtDate);

	return {
		width,
		color: isUnread ? "green" : "gray",
	};
}
