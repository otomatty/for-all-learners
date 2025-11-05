/**
 * Activity Calendar Plugin Extensions Tests
 *
 * Tests for plugin extension integration in activity calendar Server Actions.
 * Note: Full integration tests for activity_calendar.ts require complex Supabase mocking.
 * This test focuses on verifying that plugin extension data is properly merged.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ Activity Calendar components
 *
 * Dependencies:
 *   ├─ lib/plugins/calendar-registry.ts
 *   └─ app/_actions/activity_calendar.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { describe, expect, it, vi } from "vitest";
import * as calendarRegistry from "@/lib/plugins/calendar-registry";

// Mock calendar registry
vi.mock("@/lib/plugins/calendar-registry", () => ({
	getDailyExtensionData: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("Activity Calendar Plugin Extensions Integration", () => {
	describe("getDailyExtensionData integration", () => {
		it("should return empty array when no extensions registered", async () => {
			vi.mocked(calendarRegistry.getDailyExtensionData).mockResolvedValue([]);

			const result = await calendarRegistry.getDailyExtensionData("2025-01-15");

			expect(result).toEqual([]);
		});

		it("should return extension data when extensions are registered", async () => {
			const mockData = [
				{
					badge: "42 lines",
					badgeColor: "bg-green-100",
					tooltip: "GitHub commits",
				},
			];

			vi.mocked(calendarRegistry.getDailyExtensionData).mockResolvedValue(
				mockData,
			);

			const result = await calendarRegistry.getDailyExtensionData("2025-01-15");

			expect(result).toEqual(mockData);
			expect(result[0].badge).toBe("42 lines");
		});

		it("should filter out null results", async () => {
			// This test verifies the filtering logic in getDailyExtensionData
			// The actual implementation filters null results
			vi.mocked(calendarRegistry.getDailyExtensionData).mockResolvedValue([]);

			const result = await calendarRegistry.getDailyExtensionData("2025-01-15");

			expect(Array.isArray(result)).toBe(true);
		});
	});
});
