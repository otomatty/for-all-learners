/**
 * Calendar Extension Registry Tests
 *
 * Unit tests for the calendar extension registry functions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-api.ts
 *
 * Dependencies:
 *   └─ lib/plugins/calendar-registry.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as registry from "../calendar-registry";
import type { CalendarExtensionOptions } from "../types";

describe("Calendar Extension Registry", () => {
	const createMockExtension = (
		id: string,
		name?: string,
	): CalendarExtensionOptions => ({
		id,
		name: name || `Test Extension ${id}`,
		description: `Test extension description ${id}`,
		getDailyData: vi.fn().mockResolvedValue({
			badge: `Badge ${id}`,
			badgeColor: "blue",
			tooltip: `Tooltip ${id}`,
		}),
	});

	beforeEach(() => {
		registry.reset();
	});

	afterEach(() => {
		registry.reset();
	});

	describe("Calendar Extension Registration", () => {
		it("should register a calendar extension", () => {
			const pluginId = "test-plugin";
			const extension = createMockExtension("ext-1");

			expect(() => {
				registry.registerCalendarExtension(pluginId, extension);
			}).not.toThrow();

			const extensions = registry.getCalendarExtensions(pluginId);
			expect(extensions).toHaveLength(1);
			expect(extensions[0].extensionId).toBe("ext-1");
			expect(extensions[0].name).toBe("Test Extension ext-1");
		});

		it("should throw error when registering duplicate extension ID", () => {
			const pluginId = "test-plugin";
			const extension = createMockExtension("ext-1");

			registry.registerCalendarExtension(pluginId, extension);

			expect(() => {
				registry.registerCalendarExtension(pluginId, extension);
			}).toThrow("Calendar extension ext-1 already registered");
		});

		it("should unregister a calendar extension", () => {
			const pluginId = "test-plugin";
			const extension = createMockExtension("ext-1");

			registry.registerCalendarExtension(pluginId, extension);
			const result = registry.unregisterCalendarExtension(pluginId, "ext-1");

			expect(result).toBe(true);
			const extensions = registry.getCalendarExtensions(pluginId);
			expect(extensions).toHaveLength(0);
		});

		it("should unregister all extensions for a plugin", () => {
			const pluginId = "test-plugin";
			const ext1 = createMockExtension("ext-1");
			const ext2 = createMockExtension("ext-2");

			registry.registerCalendarExtension(pluginId, ext1);
			registry.registerCalendarExtension(pluginId, ext2);
			const result = registry.unregisterCalendarExtension(pluginId);

			expect(result).toBe(true);
			const extensions = registry.getCalendarExtensions(pluginId);
			expect(extensions).toHaveLength(0);
		});

		it("should return false when unregistering non-existent extension", () => {
			const pluginId = "test-plugin";
			const result = registry.unregisterCalendarExtension(pluginId, "ext-1");

			expect(result).toBe(false);
		});

		it("should allow multiple plugins to register extensions with same ID", () => {
			const plugin1 = "plugin-1";
			const plugin2 = "plugin-2";
			const ext1 = createMockExtension("ext-1", "Extension 1");
			const ext2 = createMockExtension("ext-1", "Extension 2");

			registry.registerCalendarExtension(plugin1, ext1);
			registry.registerCalendarExtension(plugin2, ext2);

			const extensions1 = registry.getCalendarExtensions(plugin1);
			const extensions2 = registry.getCalendarExtensions(plugin2);

			expect(extensions1).toHaveLength(1);
			expect(extensions2).toHaveLength(1);
			expect(extensions1[0].name).toBe("Extension 1");
			expect(extensions2[0].name).toBe("Extension 2");
		});
	});

	describe("Calendar Extension Queries", () => {
		it("should get all extensions for a plugin", () => {
			const pluginId = "test-plugin";
			const ext1 = createMockExtension("ext-1");
			const ext2 = createMockExtension("ext-2");

			registry.registerCalendarExtension(pluginId, ext1);
			registry.registerCalendarExtension(pluginId, ext2);

			const extensions = registry.getCalendarExtensions(pluginId);
			expect(extensions).toHaveLength(2);
		});

		it("should get all extensions from all plugins", () => {
			const plugin1 = "plugin-1";
			const plugin2 = "plugin-2";
			const ext1 = createMockExtension("ext-1");
			const ext2 = createMockExtension("ext-2");

			registry.registerCalendarExtension(plugin1, ext1);
			registry.registerCalendarExtension(plugin2, ext2);

			const allExtensions = registry.getCalendarExtensions();
			expect(allExtensions).toHaveLength(2);
		});

		it("should return empty array when no extensions registered", () => {
			const extensions = registry.getCalendarExtensions("non-existent");
			expect(extensions).toEqual([]);
		});

		it("should get daily extension data from all registered extensions", async () => {
			const pluginId = "test-plugin";
			const ext1 = createMockExtension("ext-1");
			const ext2 = createMockExtension("ext-2");

			registry.registerCalendarExtension(pluginId, ext1);
			registry.registerCalendarExtension(pluginId, ext2);

			const data = await registry.getDailyExtensionData("2025-01-01");

			expect(data).toHaveLength(2);
			expect(data[0].badge).toBe("Badge ext-1");
			expect(data[1].badge).toBe("Badge ext-2");
		});

		it("should filter out null results from getDailyExtensionData", async () => {
			const pluginId = "test-plugin";
			const ext1 = createMockExtension("ext-1");
			const ext2: CalendarExtensionOptions = {
				id: "ext-2",
				name: "Extension 2",
				getDailyData: vi.fn().mockResolvedValue(null),
			};

			registry.registerCalendarExtension(pluginId, ext1);
			registry.registerCalendarExtension(pluginId, ext2);

			const data = await registry.getDailyExtensionData("2025-01-01");

			expect(data).toHaveLength(1);
			expect(data[0].badge).toBe("Badge ext-1");
		});

		it("should handle errors in getDailyData", async () => {
			const pluginId = "test-plugin";
			const ext1 = createMockExtension("ext-1");
			const ext2: CalendarExtensionOptions = {
				id: "ext-2",
				name: "Extension 2",
				getDailyData: vi.fn().mockRejectedValue(new Error("Data fetch failed")),
			};

			registry.registerCalendarExtension(pluginId, ext1);
			registry.registerCalendarExtension(pluginId, ext2);

			// Should throw error when any extension fails
			await expect(
				registry.getDailyExtensionData("2025-01-01"),
			).rejects.toThrow("Data fetch failed");
		});
	});

	describe("Utility Functions", () => {
		it("should clear all extensions for a plugin", () => {
			const pluginId = "test-plugin";
			const ext1 = createMockExtension("ext-1");
			const ext2 = createMockExtension("ext-2");

			registry.registerCalendarExtension(pluginId, ext1);
			registry.registerCalendarExtension(pluginId, ext2);
			registry.clearPluginExtensions(pluginId);

			const extensions = registry.getCalendarExtensions(pluginId);
			expect(extensions).toHaveLength(0);
		});

		it("should clear all extensions", () => {
			const plugin1 = "plugin-1";
			const plugin2 = "plugin-2";
			const ext1 = createMockExtension("ext-1");
			const ext2 = createMockExtension("ext-2");

			registry.registerCalendarExtension(plugin1, ext1);
			registry.registerCalendarExtension(plugin2, ext2);
			registry.clear();

			expect(registry.getCalendarExtensions()).toHaveLength(0);
		});

		it("should reset registry", () => {
			const pluginId = "test-plugin";
			const ext1 = createMockExtension("ext-1");

			registry.registerCalendarExtension(pluginId, ext1);
			registry.reset();

			expect(registry.getCalendarExtensions()).toHaveLength(0);
		});
	});
});
