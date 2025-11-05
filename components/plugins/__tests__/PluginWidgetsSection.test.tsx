/**
 * PluginWidgetsSection Component Tests
 *
 * Tests for the widget section component that displays widgets grouped by position.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/dashboard/page.tsx
 *
 * Dependencies:
 *   ├─ components/plugins/PluginWidgetContainer.tsx
 *   └─ lib/plugins/ui-registry.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetOptions } from "@/lib/plugins/types";
import * as uiRegistry from "@/lib/plugins/ui-registry";
import { PluginWidgetsSection } from "../../../app/(protected)/dashboard/_components/PluginWidgetsSection";

// Mock ui-registry
vi.mock("@/lib/plugins/ui-registry", () => ({
	getWidgets: vi.fn(),
}));

// Mock PluginWidgetContainer
vi.mock("../../PluginWidgetContainer", () => ({
	PluginWidgetContainer: ({
		widgetId,
		name,
	}: {
		widgetId: string;
		name: string;
	}) => <div data-testid={`widget-container-${widgetId}`}>{name}</div>,
}));

describe("PluginWidgetsSection", () => {
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

	it("should return null when no widgets are registered", () => {
		vi.mocked(uiRegistry.getWidgets).mockReturnValue([]);

		const { container } = render(<PluginWidgetsSection />);

		expect(container.firstChild).toBeNull();
	});

	it("should render widgets grouped by position", async () => {
		const widgets = [
			createMockWidget("widget-1", "top-left"),
			createMockWidget("widget-2", "top-left"),
			createMockWidget("widget-3", "top-right"),
			createMockWidget("widget-4", "bottom-left"),
		];

		vi.mocked(uiRegistry.getWidgets).mockReturnValue(widgets);

		render(<PluginWidgetsSection />);

		// Wait for widgets to render (they're rendered asynchronously via PluginWidgetRenderer)
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(screen.getByText("top left")).toBeInTheDocument();
		expect(screen.getByText("top right")).toBeInTheDocument();
		expect(screen.getByText("bottom left")).toBeInTheDocument();

		// Widget names should be visible (they're rendered by PluginWidgetContainer)
		expect(screen.getByText("Widget widget-1")).toBeInTheDocument();
		expect(screen.getByText("Widget widget-2")).toBeInTheDocument();
		expect(screen.getByText("Widget widget-3")).toBeInTheDocument();
		expect(screen.getByText("Widget widget-4")).toBeInTheDocument();
	});

	it("should not render position group when no widgets for that position", () => {
		const widgets = [createMockWidget("widget-1", "top-left")];

		vi.mocked(uiRegistry.getWidgets).mockReturnValue(widgets);

		render(<PluginWidgetsSection />);

		expect(screen.getByText("top left")).toBeInTheDocument();
		expect(screen.queryByText("top right")).not.toBeInTheDocument();
		expect(screen.queryByText("bottom left")).not.toBeInTheDocument();
		expect(screen.queryByText("bottom right")).not.toBeInTheDocument();
	});

	it("should render all four positions when widgets exist", () => {
		const widgets = [
			createMockWidget("widget-1", "top-left"),
			createMockWidget("widget-2", "top-right"),
			createMockWidget("widget-3", "bottom-left"),
			createMockWidget("widget-4", "bottom-right"),
		];

		vi.mocked(uiRegistry.getWidgets).mockReturnValue(widgets);

		render(<PluginWidgetsSection />);

		expect(screen.getByText("top left")).toBeInTheDocument();
		expect(screen.getByText("top right")).toBeInTheDocument();
		expect(screen.getByText("bottom left")).toBeInTheDocument();
		expect(screen.getByText("bottom right")).toBeInTheDocument();
	});
});
