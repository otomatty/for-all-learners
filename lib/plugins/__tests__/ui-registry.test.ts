/**
 * UI Extension Registry Tests
 *
 * Unit tests for the UIExtensionRegistry class.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PageOptions, SidebarPanelOptions, WidgetOptions } from "../types";
import { UIExtensionRegistry } from "../ui-registry";

describe("UIExtensionRegistry", () => {
	let registry: UIExtensionRegistry;

	const createMockWidget = (
		id: string,
		position: WidgetOptions["position"] = "top-left",
		size: WidgetOptions["size"] = "medium",
	): WidgetOptions => ({
		id,
		name: `Test Widget ${id}`,
		description: `Test widget description ${id}`,
		position,
		size,
		render: async (_context) => ({
			type: "test-widget",
			props: { widgetId: id },
		}),
		icon: `icon-${id}`,
	});

	const createMockPage = (id: string, path: string): PageOptions => ({
		id,
		route: {
			path,
			name: `Test Page ${id}`,
			title: `Test Page Title ${id}`,
			icon: `icon-${id}`,
		},
		render: async (_context) => ({
			type: "test-page",
			props: { pageId: id },
		}),
		description: `Test page description ${id}`,
	});

	const createMockSidebarPanel = (
		id: string,
		position: SidebarPanelOptions["position"] = "left",
	): SidebarPanelOptions => ({
		id,
		name: `Test Panel ${id}`,
		description: `Test panel description ${id}`,
		position,
		render: async (_context) => ({
			type: "test-panel",
			props: { panelId: id },
		}),
		icon: `icon-${id}`,
		defaultOpen: false,
	});

	beforeEach(() => {
		registry = UIExtensionRegistry.getInstance();
	});

	afterEach(() => {
		registry.clear();
		UIExtensionRegistry.reset();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance", () => {
			const instance1 = UIExtensionRegistry.getInstance();
			const instance2 = UIExtensionRegistry.getInstance();

			expect(instance1).toBe(instance2);
		});

		it("should reset instance correctly", () => {
			const instance1 = UIExtensionRegistry.getInstance();
			UIExtensionRegistry.reset();
			const instance2 = UIExtensionRegistry.getInstance();

			expect(instance1).not.toBe(instance2);
		});
	});

	describe("Widget Registration", () => {
		it("should register a widget", () => {
			const pluginId = "test-plugin";
			const widget = createMockWidget("widget-1");

			expect(() => {
				registry.registerWidget(pluginId, widget);
			}).not.toThrow();

			const widgets = registry.getWidgets(pluginId);
			expect(widgets).toHaveLength(1);
			expect(widgets[0].widgetId).toBe("widget-1");
			expect(widgets[0].name).toBe("Test Widget widget-1");
		});

		it("should throw error when registering duplicate widget ID", () => {
			const pluginId = "test-plugin";
			const widget = createMockWidget("widget-1");

			registry.registerWidget(pluginId, widget);

			expect(() => {
				registry.registerWidget(pluginId, widget);
			}).toThrow("Widget widget-1 already registered");
		});

		it("should unregister a widget", () => {
			const pluginId = "test-plugin";
			const widget = createMockWidget("widget-1");

			registry.registerWidget(pluginId, widget);
			const result = registry.unregisterWidget(pluginId, "widget-1");

			expect(result).toBe(true);
			expect(registry.getWidgets(pluginId)).toHaveLength(0);
		});

		it("should unregister all widgets for a plugin", () => {
			const pluginId = "test-plugin";
			registry.registerWidget(pluginId, createMockWidget("widget-1"));
			registry.registerWidget(pluginId, createMockWidget("widget-2"));

			const result = registry.unregisterWidget(pluginId);

			expect(result).toBe(true);
			expect(registry.getWidgets(pluginId)).toHaveLength(0);
		});

		it("should filter widgets by position", () => {
			const pluginId = "test-plugin";
			registry.registerWidget(
				pluginId,
				createMockWidget("widget-1", "top-left"),
			);
			registry.registerWidget(
				pluginId,
				createMockWidget("widget-2", "top-right"),
			);
			registry.registerWidget(
				pluginId,
				createMockWidget("widget-3", "top-left"),
			);

			const topLeftWidgets = registry.getWidgets(pluginId, "top-left");
			expect(topLeftWidgets).toHaveLength(2);
			expect(topLeftWidgets.every((w) => w.position === "top-left")).toBe(true);
		});
	});

	describe("Page Registration", () => {
		it("should register a page", () => {
			const pluginId = "test-plugin";
			const page = createMockPage("page-1", "/test/page-1");

			expect(() => {
				registry.registerPage(pluginId, page);
			}).not.toThrow();

			const pages = registry.getPages(pluginId);
			expect(pages).toHaveLength(1);
			expect(pages[0].pageId).toBe("page-1");
			expect(pages[0].route.path).toBe("/test/page-1");
		});

		it("should throw error when registering duplicate page ID", () => {
			const pluginId = "test-plugin";
			const page = createMockPage("page-1", "/test/page-1");

			registry.registerPage(pluginId, page);

			expect(() => {
				registry.registerPage(pluginId, page);
			}).toThrow("Page page-1 already registered");
		});

		it("should throw error when registering duplicate route path", () => {
			const pluginId1 = "test-plugin-1";
			const pluginId2 = "test-plugin-2";
			const page1 = createMockPage("page-1", "/test/page");
			const page2 = createMockPage("page-2", "/test/page");

			registry.registerPage(pluginId1, page1);

			expect(() => {
				registry.registerPage(pluginId2, page2);
			}).toThrow('Page route "/test/page" is already used');
		});

		it("should get page by route path", () => {
			const pluginId = "test-plugin";
			const page = createMockPage("page-1", "/test/page-1");

			registry.registerPage(pluginId, page);

			const foundPage = registry.getPageByRoute("/test/page-1");
			expect(foundPage).toBeDefined();
			expect(foundPage?.pageId).toBe("page-1");
		});

		it("should unregister a page", () => {
			const pluginId = "test-plugin";
			const page = createMockPage("page-1", "/test/page-1");

			registry.registerPage(pluginId, page);
			const result = registry.unregisterPage(pluginId, "page-1");

			expect(result).toBe(true);
			expect(registry.getPages(pluginId)).toHaveLength(0);
			expect(registry.getPageByRoute("/test/page-1")).toBeUndefined();
		});

		it("should unregister all pages for a plugin", () => {
			const pluginId = "test-plugin";
			registry.registerPage(pluginId, createMockPage("page-1", "/test/page-1"));
			registry.registerPage(pluginId, createMockPage("page-2", "/test/page-2"));

			const result = registry.unregisterPage(pluginId);

			expect(result).toBe(true);
			expect(registry.getPages(pluginId)).toHaveLength(0);
		});
	});

	describe("Sidebar Panel Registration", () => {
		it("should register a sidebar panel", () => {
			const pluginId = "test-plugin";
			const panel = createMockSidebarPanel("panel-1");

			expect(() => {
				registry.registerSidebarPanel(pluginId, panel);
			}).not.toThrow();

			const panels = registry.getSidebarPanels(pluginId);
			expect(panels).toHaveLength(1);
			expect(panels[0].panelId).toBe("panel-1");
			expect(panels[0].name).toBe("Test Panel panel-1");
		});

		it("should throw error when registering duplicate panel ID", () => {
			const pluginId = "test-plugin";
			const panel = createMockSidebarPanel("panel-1");

			registry.registerSidebarPanel(pluginId, panel);

			expect(() => {
				registry.registerSidebarPanel(pluginId, panel);
			}).toThrow("Sidebar panel panel-1 already registered");
		});

		it("should unregister a sidebar panel", () => {
			const pluginId = "test-plugin";
			const panel = createMockSidebarPanel("panel-1");

			registry.registerSidebarPanel(pluginId, panel);
			const result = registry.unregisterSidebarPanel(pluginId, "panel-1");

			expect(result).toBe(true);
			expect(registry.getSidebarPanels(pluginId)).toHaveLength(0);
		});

		it("should unregister all panels for a plugin", () => {
			const pluginId = "test-plugin";
			registry.registerSidebarPanel(
				pluginId,
				createMockSidebarPanel("panel-1"),
			);
			registry.registerSidebarPanel(
				pluginId,
				createMockSidebarPanel("panel-2"),
			);

			const result = registry.unregisterSidebarPanel(pluginId);

			expect(result).toBe(true);
			expect(registry.getSidebarPanels(pluginId)).toHaveLength(0);
		});

		it("should filter panels by position", () => {
			const pluginId = "test-plugin";
			registry.registerSidebarPanel(
				pluginId,
				createMockSidebarPanel("panel-1", "left"),
			);
			registry.registerSidebarPanel(
				pluginId,
				createMockSidebarPanel("panel-2", "right"),
			);
			registry.registerSidebarPanel(
				pluginId,
				createMockSidebarPanel("panel-3", "left"),
			);

			const leftPanels = registry.getSidebarPanels(pluginId, "left");
			expect(leftPanels).toHaveLength(2);
			expect(leftPanels.every((p) => p.position === "left")).toBe(true);
		});
	});

	describe("Query Operations", () => {
		it("should get widgets for all plugins", () => {
			registry.registerWidget("plugin-1", createMockWidget("widget-1"));
			registry.registerWidget("plugin-2", createMockWidget("widget-2"));

			const allWidgets = registry.getWidgets();
			expect(allWidgets).toHaveLength(2);
		});

		it("should get pages for all plugins", () => {
			registry.registerPage(
				"plugin-1",
				createMockPage("page-1", "/test/page-1"),
			);
			registry.registerPage(
				"plugin-2",
				createMockPage("page-2", "/test/page-2"),
			);

			const allPages = registry.getPages();
			expect(allPages).toHaveLength(2);
		});

		it("should get panels for all plugins", () => {
			registry.registerSidebarPanel(
				"plugin-1",
				createMockSidebarPanel("panel-1"),
			);
			registry.registerSidebarPanel(
				"plugin-2",
				createMockSidebarPanel("panel-2"),
			);

			const allPanels = registry.getSidebarPanels();
			expect(allPanels).toHaveLength(2);
		});
	});

	describe("Plugin Cleanup", () => {
		it("should clear all extensions for a plugin", () => {
			const pluginId = "test-plugin";

			registry.registerWidget(pluginId, createMockWidget("widget-1"));
			registry.registerPage(pluginId, createMockPage("page-1", "/test/page-1"));
			registry.registerSidebarPanel(
				pluginId,
				createMockSidebarPanel("panel-1"),
			);

			registry.clearPlugin(pluginId);

			expect(registry.getWidgets(pluginId)).toHaveLength(0);
			expect(registry.getPages(pluginId)).toHaveLength(0);
			expect(registry.getSidebarPanels(pluginId)).toHaveLength(0);
		});

		it("should clear all extensions", () => {
			registry.registerWidget("plugin-1", createMockWidget("widget-1"));
			registry.registerPage(
				"plugin-2",
				createMockPage("page-1", "/test/page-1"),
			);
			registry.registerSidebarPanel(
				"plugin-3",
				createMockSidebarPanel("panel-1"),
			);

			registry.clear();

			expect(registry.getWidgets()).toHaveLength(0);
			expect(registry.getPages()).toHaveLength(0);
			expect(registry.getSidebarPanels()).toHaveLength(0);
		});
	});

	describe("Statistics", () => {
		it("should return correct statistics", () => {
			registry.registerWidget("plugin-1", createMockWidget("widget-1"));
			registry.registerWidget("plugin-1", createMockWidget("widget-2"));
			registry.registerPage(
				"plugin-2",
				createMockPage("page-1", "/test/page-1"),
			);
			registry.registerSidebarPanel(
				"plugin-3",
				createMockSidebarPanel("panel-1"),
			);

			const stats = registry.getStats();

			expect(stats.totalPlugins).toBe(3);
			expect(stats.totalWidgets).toBe(2);
			expect(stats.totalPages).toBe(1);
			expect(stats.totalPanels).toBe(1);
		});
	});
});
