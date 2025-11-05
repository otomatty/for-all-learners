/**
 * PluginWidgetContainer Component Tests
 *
 * Tests for the widget container component that wraps widgets in cards.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/dashboard/_components/PluginWidgetsSection.tsx
 *
 * Dependencies:
 *   ├─ components/plugins/PluginWidgetRenderer.tsx
 *   └─ components/ui/card.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PluginWidgetContainer } from "../PluginWidgetContainer";

// Mock ui-registry
vi.mock("@/lib/plugins/ui-registry", () => ({
	getWidgets: vi.fn(),
}));

// Mock PluginWidgetRenderer
vi.mock("../PluginWidgetRenderer", () => ({
	PluginWidgetRenderer: ({ widgetId }: { widgetId: string }) => (
		<div data-testid={`widget-renderer-${widgetId}`}>Widget Content</div>
	),
}));

describe("PluginWidgetContainer", () => {
	const mockPluginId = "test-plugin";
	const mockWidgetId = "test-widget";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render widget container with title", () => {
		render(
			<PluginWidgetContainer
				pluginId={mockPluginId}
				widgetId={mockWidgetId}
				name="Test Widget"
				size="medium"
			/>,
		);

		expect(screen.getByText("Test Widget")).toBeInTheDocument();
		expect(
			screen.getByTestId(`widget-renderer-${mockWidgetId}`),
		).toBeInTheDocument();
	});

	it("should render widget container with description", () => {
		render(
			<PluginWidgetContainer
				pluginId={mockPluginId}
				widgetId={mockWidgetId}
				name="Test Widget"
				description="Test widget description"
				size="medium"
			/>,
		);

		expect(screen.getByText("Test Widget")).toBeInTheDocument();
		expect(screen.getByText("Test widget description")).toBeInTheDocument();
	});

	it("should render widget container with icon", () => {
		const { container } = render(
			<PluginWidgetContainer
				pluginId={mockPluginId}
				widgetId={mockWidgetId}
				name="Test Widget"
				icon="📊"
				size="medium"
			/>,
		);

		expect(screen.getByText("Test Widget")).toBeInTheDocument();
		expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(
			"📊",
		);
	});

	it("should apply small size class", () => {
		const { container } = render(
			<PluginWidgetContainer
				pluginId={mockPluginId}
				widgetId={mockWidgetId}
				name="Test Widget"
				size="small"
			/>,
		);

		const card = container.querySelector('[data-slot="card"]');
		expect(card).toHaveClass("col-span-1");
	});

	it("should apply medium size class", () => {
		const { container } = render(
			<PluginWidgetContainer
				pluginId={mockPluginId}
				widgetId={mockWidgetId}
				name="Test Widget"
				size="medium"
			/>,
		);

		const card = container.querySelector('[data-slot="card"]');
		expect(card).toHaveClass("col-span-2");
	});

	it("should apply large size class", () => {
		const { container } = render(
			<PluginWidgetContainer
				pluginId={mockPluginId}
				widgetId={mockWidgetId}
				name="Test Widget"
				size="large"
			/>,
		);

		const card = container.querySelector('[data-slot="card"]');
		expect(card).toHaveClass("col-span-3");
	});

	it("should not render description when not provided", () => {
		const { container } = render(
			<PluginWidgetContainer
				pluginId={mockPluginId}
				widgetId={mockWidgetId}
				name="Test Widget"
				size="medium"
			/>,
		);

		expect(
			container.querySelector('[data-slot="card-description"]'),
		).not.toBeInTheDocument();
	});

	it("should not render icon when not provided", () => {
		const { container } = render(
			<PluginWidgetContainer
				pluginId={mockPluginId}
				widgetId={mockWidgetId}
				name="Test Widget"
				size="medium"
			/>,
		);

		expect(
			container.querySelector('[aria-hidden="true"]'),
		).not.toBeInTheDocument();
	});
});
