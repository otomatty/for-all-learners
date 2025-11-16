/**
 * Telomere Calculator Tests
 *
 * Tests for telomere width calculation and unread line detection
 */

import { describe, expect, it } from "vitest";
import {
	calculateTelomereWidth,
	getTelomereStyle,
	isUnreadLine,
	parseDate,
} from "../telomere-calculator";

describe("Telomere Calculator", () => {
	describe("calculateTelomereWidth", () => {
		it("should return maximum width for newly updated lines", () => {
			const now = new Date("2025-11-16T12:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const width = calculateTelomereWidth(updatedAt, now);
			// TIME_INTERVALS_MS has 14 elements, so MAX_TELOMERE_WIDTH is 14
			// The first interval is 0, so elapsed >= 0 is always true, width decreases by 1
			// At 0 elapsed time, width is 13 (14 - 1 for the 0-hour interval)
			expect(width).toBe(13); // 14 - 1 (0-hour interval always passes)
		});

		it("should return width - 2 after 1 hour", () => {
			const now = new Date("2025-11-16T13:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const width = calculateTelomereWidth(updatedAt, now);
			// After 1 hour, 0-hour and 1-hour intervals have passed
			expect(width).toBe(12); // 14 - 2
		});

		it("should return width - 3 after 2 hours", () => {
			const now = new Date("2025-11-16T14:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const width = calculateTelomereWidth(updatedAt, now);
			// After 2 hours, 0-hour, 1-hour, and 2-hour intervals have passed
			expect(width).toBe(11); // 14 - 3
		});

		it("should return width - 4 after 6 hours", () => {
			const now = new Date("2025-11-16T18:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const width = calculateTelomereWidth(updatedAt, now);
			// After 6 hours, 0-hour, 1-hour, 2-hour, and 6-hour intervals have passed
			expect(width).toBe(10); // 14 - 4
		});

		it("should return width - 7 after 24 hours", () => {
			const now = new Date("2025-11-17T12:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const width = calculateTelomereWidth(updatedAt, now);
			expect(width).toBe(7); // 14 - 7
		});

		it("should return width - 8 after 72 hours", () => {
			const now = new Date("2025-11-19T12:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const width = calculateTelomereWidth(updatedAt, now);
			expect(width).toBe(6); // 14 - 8
		});

		it("should return width - 9 after 7 days", () => {
			const now = new Date("2025-11-23T12:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const width = calculateTelomereWidth(updatedAt, now);
			expect(width).toBe(5); // 14 - 9
		});

		it("should return width - 10 after 30 days", () => {
			const now = new Date("2025-12-16T12:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const width = calculateTelomereWidth(updatedAt, now);
			expect(width).toBe(4); // 14 - 10
		});

		it("should return minimum width (1px) for very old lines", () => {
			const now = new Date("2026-11-16T12:00:00Z"); // 1 year later
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const width = calculateTelomereWidth(updatedAt, now);
			expect(width).toBe(1); // MIN_TELOMERE_WIDTH
		});

		it("should return maximum width for future dates", () => {
			const now = new Date("2025-11-16T12:00:00Z");
			const updatedAt = new Date("2025-11-16T13:00:00Z"); // Future
			const width = calculateTelomereWidth(updatedAt, now);
			expect(width).toBe(14); // MAX_TELOMERE_WIDTH (graceful handling)
		});

		it("should handle edge case: exactly at interval boundary", () => {
			const now = new Date("2025-11-16T13:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z"); // Exactly 1 hour
			const width = calculateTelomereWidth(updatedAt, now);
			expect(width).toBe(12); // 14 - 2 (0-hour and 1-hour intervals passed)
		});

		it("should handle edge case: just before interval boundary", () => {
			const now = new Date("2025-11-16T12:59:59Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z"); // Just under 1 hour
			const width = calculateTelomereWidth(updatedAt, now);
			expect(width).toBe(13); // 14 - 1 (only 0-hour interval passed)
		});
	});

	describe("isUnreadLine", () => {
		it("should return false when lastVisitedAt is null", () => {
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const lastVisitedAt = null;
			const isUnread = isUnreadLine(updatedAt, lastVisitedAt);
			expect(isUnread).toBe(false);
		});

		it("should return true when line was updated after last visit", () => {
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const lastVisitedAt = new Date("2025-11-16T10:00:00Z");
			const isUnread = isUnreadLine(updatedAt, lastVisitedAt);
			expect(isUnread).toBe(true);
		});

		it("should return false when line was updated before last visit", () => {
			const updatedAt = new Date("2025-11-16T10:00:00Z");
			const lastVisitedAt = new Date("2025-11-16T12:00:00Z");
			const isUnread = isUnreadLine(updatedAt, lastVisitedAt);
			expect(isUnread).toBe(false);
		});

		it("should return false when line was updated at the same time as last visit", () => {
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const lastVisitedAt = new Date("2025-11-16T12:00:00Z");
			const isUnread = isUnreadLine(updatedAt, lastVisitedAt);
			expect(isUnread).toBe(false);
		});

		it("should return false when line was updated just before last visit", () => {
			const updatedAt = new Date("2025-11-16T11:59:59Z");
			const lastVisitedAt = new Date("2025-11-16T12:00:00Z");
			const isUnread = isUnreadLine(updatedAt, lastVisitedAt);
			expect(isUnread).toBe(false);
		});
	});

	describe("parseDate", () => {
		it("should return Date object as-is when Date is passed", () => {
			const date = new Date("2025-11-16T12:00:00Z");
			const parsed = parseDate(date);
			expect(parsed).toBe(date);
			expect(parsed instanceof Date).toBe(true);
		});

		it("should parse ISO string to Date object", () => {
			const dateString = "2025-11-16T12:00:00Z";
			const parsed = parseDate(dateString);
			expect(parsed instanceof Date).toBe(true);
			// toISOString() adds milliseconds, so we check the date part
			expect(parsed.toISOString().startsWith("2025-11-16T12:00:00")).toBe(true);
		});

		it("should handle various ISO string formats", () => {
			const dateString = "2025-11-16T12:00:00.000Z";
			const parsed = parseDate(dateString);
			expect(parsed instanceof Date).toBe(true);
		});
	});

	describe("getTelomereStyle", () => {
		it("should return green color for unread lines", () => {
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const lastVisitedAt = new Date("2025-11-16T10:00:00Z");
			const style = getTelomereStyle(updatedAt, lastVisitedAt);
			expect(style.color).toBe("green");
			expect(style.width).toBeGreaterThanOrEqual(1);
			expect(style.width).toBeLessThanOrEqual(14);
		});

		it("should return gray color for read lines", () => {
			const updatedAt = new Date("2025-11-16T10:00:00Z");
			const lastVisitedAt = new Date("2025-11-16T12:00:00Z");
			const style = getTelomereStyle(updatedAt, lastVisitedAt);
			expect(style.color).toBe("gray");
			expect(style.width).toBeGreaterThanOrEqual(1);
			expect(style.width).toBeLessThanOrEqual(14);
		});

		it("should return gray color when lastVisitedAt is null", () => {
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const lastVisitedAt = null;
			const style = getTelomereStyle(updatedAt, lastVisitedAt);
			expect(style.color).toBe("gray");
		});

		it("should accept string dates", () => {
			const updatedAt = "2025-11-16T12:00:00Z";
			const lastVisitedAt = "2025-11-16T10:00:00Z";
			const style = getTelomereStyle(updatedAt, lastVisitedAt);
			expect(style.color).toBe("green");
			expect(style.width).toBeGreaterThanOrEqual(1);
		});

		it("should calculate correct width for 2-hour-old line", () => {
			const now = new Date("2025-11-16T14:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const lastVisitedAt = new Date("2025-11-16T10:00:00Z");
			const style = getTelomereStyle(updatedAt, lastVisitedAt, now);
			expect(style.width).toBe(11); // 14 - 3 (0-hour, 1-hour, 2-hour intervals)
			expect(style.color).toBe("green");
		});

		it("should calculate correct width for 1-year-old line", () => {
			const now = new Date("2026-11-16T12:00:00Z");
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			// Updated after last visit, so should be green
			const lastVisitedAt = new Date("2025-11-15T10:00:00Z");
			const style = getTelomereStyle(updatedAt, lastVisitedAt, now);
			expect(style.width).toBe(1); // Minimum width
			expect(style.color).toBe("green"); // Unread (updated after last visit)
		});

		it("should handle mixed string and Date inputs", () => {
			const updatedAt = new Date("2025-11-16T12:00:00Z");
			const lastVisitedAt = "2025-11-16T10:00:00Z";
			const style = getTelomereStyle(updatedAt, lastVisitedAt);
			expect(style.color).toBe("green");
		});
	});
});
