/**
 * Plugin Widgets Server Actions Tests
 *
 * Tests for Server Actions that fetch plugin widget metadata.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ components/plugins/PluginWidgetRenderer.tsx
 *
 * Dependencies:
 *   └─ lib/plugins/ui-registry.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetOptions } from "@/lib/plugins/types";
import * as uiRegistry from "@/lib/plugins/ui-registry";
import { getAllWidgets, getWidgetsByPosition } from "../plugin-widgets";

// Mock ui-registry
vi.mock("@/lib/plugins/ui-registry", () => ({
	getWidgets: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("Plugin Widgets Server Actions", () => {
	const createMockWidget = (
		id: string,
		position: WidgetOptions["position"] = "top-left",
	): ReturnType<typeof uiRegistry.getWidgets>[number] => ({
		pluginId: "test-plugin",
		widgetId: id,
		name: `Widget ${id}`,
		description: `Description ${id}`,
		position,
		size: "medium",
		render: vi.fn(),
		icon: "📊",
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAllWidgets", () => {
		it("should return widget metadata without render functions", async () => {
			const widgets = [
				createMockWidget("widget-1", "top-left"),
				createMockWidget("widget-2", "top-right"),
			];

			vi.mocked(uiRegistry.getWidgets).mockReturnValue(widgets);

			const result = await getAllWidgets();

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				pluginId: "test-plugin",
				widgetId: "widget-1",
				name: "Widget widget-1",
				description: "Description widget-1",
				position: "top-left",
				size: "medium",
				icon: "📊",
			});
			expect(result[0]).not.toHaveProperty("render");
		});

		it("should return empty array when no widgets are registered", async () => {
			vi.mocked(uiRegistry.getWidgets).mockReturnValue([]);

			const result = await getAllWidgets();

			expect(result).toEqual([]);
		});

		it("should handle errors gracefully", async () => {
			vi.mocked(uiRegistry.getWidgets).mockImplementation(() => {
				throw new Error("Registry error");
			});

			const result = await getAllWidgets();

			expect(result).toEqual([]);
		});
	});

	describe("getWidgetsByPosition", () => {
		it("should return widgets filtered by position", async () => {
			const widgets = [
				createMockWidget("widget-1", "top-left"),
				createMockWidget("widget-2", "top-left"),
				createMockWidget("widget-3", "top-right"),
			];

			// getWidgets is called with position filter, so it returns filtered results
			vi.mocked(uiRegistry.getWidgets).mockImplementation(
				(_pluginId, position) => {
					if (position) {
						return widgets.filter((w) => w.position === position);
					}
					return widgets;
				},
			);

			const result = await getWidgetsByPosition("top-left");

			expect(result).toHaveLength(2);
			expect(result[0].widgetId).toBe("widget-1");
			expect(result[1].widgetId).toBe("widget-2");
			expect(result.every((w) => w.position === "top-left")).toBe(true);
		});

		it("should return empty array when no widgets for position", async () => {
			const widgets = [
				createMockWidget("widget-1", "top-left"),
				createMockWidget("widget-2", "top-right"),
			];

			// getWidgets is called with position filter
			vi.mocked(uiRegistry.getWidgets).mockImplementation(
				(_pluginId, position) => {
					if (position) {
						return widgets.filter((w) => w.position === position);
					}
					return widgets;
				},
			);

			const result = await getWidgetsByPosition("bottom-left");

			expect(result).toEqual([]);
		});

		it("should handle errors gracefully", async () => {
			vi.mocked(uiRegistry.getWidgets).mockImplementation(() => {
				throw new Error("Registry error");
			});

			const result = await getWidgetsByPosition("top-left");

			expect(result).toEqual([]);
		});

		it("should support all position types", async () => {
			const positions: WidgetOptions["position"][] = [
				"top-left",
				"top-right",
				"bottom-left",
				"bottom-right",
			];

			for (const position of positions) {
				const widgets = [createMockWidget("widget-1", position)];

				// getWidgets is called with position filter
				vi.mocked(uiRegistry.getWidgets).mockImplementation(
					(_pluginId, pos) => {
						if (pos) {
							return widgets.filter((w) => w.position === pos);
						}
						return widgets;
					},
				);

				const result = await getWidgetsByPosition(position);

				expect(result).toHaveLength(1);
				expect(result[0].position).toBe(position);
			}
		});
	});
});
