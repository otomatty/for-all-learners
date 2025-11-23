/**
 * Tests for usePluginWidgets hooks
 *
 * Test Coverage:
 * - TC-001: 正常系 - 全ウィジェットの取得成功
 * - TC-002: 正常系 - 位置別ウィジェットの取得成功
 */

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getWidgets } from "@/lib/plugins/ui-registry";
import {
	usePluginWidgets,
	usePluginWidgetsByPosition,
} from "../usePluginWidgets";
import { createWrapper } from "./helpers";

// Mock ui-registry
vi.mock("@/lib/plugins/ui-registry");

describe("usePluginWidgets", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("usePluginWidgets", () => {
		// TC-001: 正常系 - 全ウィジェットの取得成功
		test("TC-001: Should get all widgets successfully", async () => {
			const mockWidgets = [
				{
					pluginId: "plugin-1",
					widgetId: "widget-1",
					name: "Widget 1",
					description: "Description 1",
					position: "top-left" as const,
					size: "small" as const,
					icon: "icon-1",
					render: vi.fn(),
				},
				{
					pluginId: "plugin-2",
					widgetId: "widget-2",
					name: "Widget 2",
					description: "Description 2",
					position: "top-right" as const,
					size: "medium" as const,
					icon: "icon-2",
					render: vi.fn(),
				},
			];

			vi.mocked(getWidgets).mockReturnValue(mockWidgets);

			const { result } = renderHook(() => usePluginWidgets(), {
				wrapper: createWrapper(),
			});

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual([
				{
					pluginId: "plugin-1",
					widgetId: "widget-1",
					name: "Widget 1",
					description: "Description 1",
					position: "top-left",
					size: "small",
					icon: "icon-1",
				},
				{
					pluginId: "plugin-2",
					widgetId: "widget-2",
					name: "Widget 2",
					description: "Description 2",
					position: "top-right",
					size: "medium",
					icon: "icon-2",
				},
			]);
		});
	});

	describe("usePluginWidgetsByPosition", () => {
		// TC-002: 正常系 - 位置別ウィジェットの取得成功
		test("TC-002: Should get widgets by position successfully", async () => {
			const mockWidgets = [
				{
					pluginId: "plugin-1",
					widgetId: "widget-1",
					name: "Widget 1",
					description: "Description 1",
					position: "top-left" as const,
					size: "small" as const,
					icon: "icon-1",
					render: vi.fn(),
				},
			];

			vi.mocked(getWidgets).mockReturnValue(mockWidgets);

			const { result } = renderHook(
				() => usePluginWidgetsByPosition("top-left"),
				{
					wrapper: createWrapper(),
				},
			);

			await waitFor(() => {
				expect(result.current.isSuccess).toBe(true);
			});

			expect(result.current.data).toEqual([
				{
					pluginId: "plugin-1",
					widgetId: "widget-1",
					name: "Widget 1",
					description: "Description 1",
					position: "top-left",
					size: "small",
					icon: "icon-1",
				},
			]);

			expect(getWidgets).toHaveBeenCalledWith(undefined, "top-left");
		});
	});
});
