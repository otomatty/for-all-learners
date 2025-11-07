/**
 * PluginWidgetRenderer Component Tests
 *
 * Tests for the widget rendering component that calls plugin render functions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ components/plugins/PluginWidgetContainer.tsx
 *
 * Dependencies:
 *   ├─ lib/plugins/ui-registry.ts
 *   └─ components/plugins/widget-renderers/
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetRenderResult } from "@/lib/plugins/types";
import * as uiRegistry from "@/lib/plugins/ui-registry";
import { PluginWidgetRenderer } from "../PluginWidgetRenderer";

// Mock ui-registry
vi.mock("@/lib/plugins/ui-registry", () => ({
	getWidgets: vi.fn(),
}));

describe("PluginWidgetRenderer", () => {
	const mockPluginId = "test-plugin";
	const mockWidgetId = "test-widget";

	const createMockWidget = (renderResult: WidgetRenderResult) => ({
		pluginId: mockPluginId,
		widgetId: mockWidgetId,
		name: "Test Widget",
		description: "Test widget description",
		position: "top-left" as const,
		size: "medium" as const,
		render: vi.fn().mockResolvedValue(renderResult),
		icon: "📊",
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should show loading state initially", () => {
		vi.mocked(uiRegistry.getWidgets).mockReturnValue([
			createMockWidget({
				type: "stat-card",
				props: { title: "Test", value: 100 },
			}),
		]);

		const { container } = render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		// Check for loading spinner
		const spinner = container.querySelector(
			".animate-spin.rounded-full.border-2",
		);
		expect(spinner).toBeInTheDocument();
	});

	it("should render widget with stat-card type", async () => {
		const mockWidget = createMockWidget({
			type: "stat-card",
			props: {
				title: "Total Commits",
				value: 42,
				description: "This month",
			},
		});

		vi.mocked(uiRegistry.getWidgets).mockReturnValue([mockWidget]);

		render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		await waitFor(() => {
			expect(screen.getByText("Total Commits")).toBeInTheDocument();
		});

		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.getByText("This month")).toBeInTheDocument();
	});

	it("should render widget with metric type", async () => {
		const mockWidget = createMockWidget({
			type: "metric",
			props: {
				label: "Active Users",
				value: 150,
				unit: "users",
			},
		});

		vi.mocked(uiRegistry.getWidgets).mockReturnValue([mockWidget]);

		render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		await waitFor(() => {
			expect(screen.getByText("Active Users")).toBeInTheDocument();
		});

		expect(screen.getByText("150")).toBeInTheDocument();
		expect(screen.getByText("users")).toBeInTheDocument();
	});

	it("should render widget with list type", async () => {
		const mockWidget = createMockWidget({
			type: "list",
			props: {
				items: [
					{ label: "Item 1", value: 10 },
					{ label: "Item 2", value: 20 },
				],
			},
		});

		vi.mocked(uiRegistry.getWidgets).mockReturnValue([mockWidget]);

		render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		await waitFor(() => {
			expect(screen.getByText("Item 1")).toBeInTheDocument();
		});

		expect(screen.getByText("Item 2")).toBeInTheDocument();
	});

	it("should render widget with text type", async () => {
		const mockWidget = createMockWidget({
			type: "text",
			props: {
				content: "Hello, World!",
				variant: "primary",
			},
		});

		vi.mocked(uiRegistry.getWidgets).mockReturnValue([mockWidget]);

		render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		await waitFor(() => {
			expect(screen.getByText("Hello, World!")).toBeInTheDocument();
		});
	});

	it("should show error when widget is not found", async () => {
		vi.mocked(uiRegistry.getWidgets).mockReturnValue([]);

		render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		await waitFor(() => {
			expect(
				screen.getByText(`Error: Widget ${mockWidgetId} not found`),
			).toBeInTheDocument();
		});
	});

	it("should show error when render function fails", async () => {
		const mockWidget = createMockWidget({
			type: "stat-card",
			props: { title: "Test", value: 100 },
		});
		mockWidget.render.mockRejectedValue(new Error("Render failed"));

		vi.mocked(uiRegistry.getWidgets).mockReturnValue([mockWidget]);

		render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		await waitFor(() => {
			expect(screen.getByText("Error: Render failed")).toBeInTheDocument();
		});
	});

	it("should show message when HTML rendering is attempted", async () => {
		const mockWidget = createMockWidget({
			type: "custom",
			html: "<div>HTML Content</div>",
		});

		vi.mocked(uiRegistry.getWidgets).mockReturnValue([mockWidget]);

		render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		await waitFor(() => {
			expect(
				screen.getByText(
					/HTML rendering is not supported. Please use props-based rendering/,
				),
			).toBeInTheDocument();
		});
	});

	it("should render custom type when type is not recognized", async () => {
		const mockWidget = createMockWidget({
			type: "unknown-type",
			props: {
				key1: "value1",
				key2: "value2",
			},
		});

		vi.mocked(uiRegistry.getWidgets).mockReturnValue([mockWidget]);

		render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		await waitFor(() => {
			expect(screen.getByText("key1:")).toBeInTheDocument();
			expect(screen.getByText("value1")).toBeInTheDocument();
		});
	});

	it("should return null when render result is null", async () => {
		const mockWidget = {
			pluginId: mockPluginId,
			widgetId: mockWidgetId,
			name: "Test Widget",
			description: "Test widget description",
			position: "top-left" as const,
			size: "medium" as const,
			render: vi.fn().mockResolvedValue(null),
			icon: "📊",
		};

		vi.mocked(uiRegistry.getWidgets).mockReturnValue([mockWidget]);

		const { container } = render(
			<PluginWidgetRenderer pluginId={mockPluginId} widgetId={mockWidgetId} />,
		);

		await waitFor(() => {
			// When renderResult is null, component returns null
			expect(container.firstChild).toBeNull();
		});
	});
});
