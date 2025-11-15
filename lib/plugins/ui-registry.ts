/**
 * UI Extension Registry
 *
 * Manages UI extensions registered by plugins.
 * Provides registration, unregistration, and query capabilities for UI extensions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-api.ts
 *   └─ lib/plugins/ui-manager.ts (future)
 *
 * Dependencies:
 *   ├─ lib/plugins/types.ts (UI extension types)
 *   └─ lib/logger
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase2-extension-points.md
 */

import logger from "@/lib/logger";
import { logPluginMessage } from "./debug-tools";
import { getPluginLoader } from "./plugin-loader/plugin-loader";
import type {
	PageOptions,
	SidebarPanelOptions,
	WidgetContext,
	WidgetOptions,
	WidgetRenderResult,
} from "./types";

// ============================================================================
// UI Extension Entry Types
// ============================================================================

/**
 * Widget entry
 */
export interface WidgetEntry {
	pluginId: string;
	widgetId: string;
	name: string;
	description?: string;
	position: WidgetOptions["position"];
	size: WidgetOptions["size"];
	render: WidgetOptions["render"];
	icon?: string;
	/** Whether this widget's render function is in Worker context */
	isWorkerContext?: boolean;
}

/**
 * Page entry
 */
export interface PageEntry {
	pluginId: string;
	pageId: string;
	route: PageOptions["route"];
	render: PageOptions["render"];
	description?: string;
}

/**
 * Sidebar panel entry
 */
export interface SidebarPanelEntry {
	pluginId: string;
	panelId: string;
	name: string;
	description?: string;
	position: SidebarPanelOptions["position"];
	render: SidebarPanelOptions["render"];
	icon?: string;
	defaultOpen?: boolean;
}

// ============================================================================
// State (Private)
// ============================================================================

/** Map of plugin ID to array of widgets */
const widgets = new Map<string, WidgetEntry[]>();

/** Map of plugin ID to array of pages */
const pages = new Map<string, PageEntry[]>();

/** Map of plugin ID to array of sidebar panels */
const sidebarPanels = new Map<string, SidebarPanelEntry[]>();

/** Map of route path to page entry (for quick lookup) */
const routeMap = new Map<string, PageEntry>();

// ============================================================================
// Widget Registration
// ============================================================================

/**
 * Register a widget
 *
 * @param pluginId Plugin ID registering the widget
 * @param options Widget options
 * @throws Error if widget ID already exists for this plugin
 */
export function registerWidget(pluginId: string, options: WidgetOptions): void {
	const pluginWidgets = widgets.get(pluginId) ?? [];

	// Check if widget ID already exists
	const existing = pluginWidgets.find(
		(widget) => widget.widgetId === options.id,
	);

	if (existing) {
		throw new Error(
			`Widget ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	// Check if render function is missing (Worker context)
	// In Worker context, functions cannot be serialized via postMessage
	const isWorkerContext =
		options.render === undefined || typeof options.render !== "function";

	logger.debug(
		{
			pluginId,
			widgetId: options.id,
			hasRender: !!options.render,
			renderType: typeof options.render,
			isWorkerContext,
		},
		"[registerWidget] Registering widget",
	);

	// Create render function wrapper for Worker context
	let renderFunction: WidgetOptions["render"];
	if (isWorkerContext) {
		// Create a wrapper that calls the Worker's render method
		renderFunction = async (
			context: WidgetContext,
		): Promise<WidgetRenderResult> => {
			const loader = getPluginLoader();

			// Call the plugin's render method via CALL_METHOD message
			// The method name follows the pattern: __widget_render_${widgetId}
			const methodName = `__widget_render_${options.id}`;

			try {
				const result = await loader.callPluginMethod(
					pluginId,
					methodName,
					context,
				);
				return result as WidgetRenderResult;
			} catch (error) {
				logger.error(
					{
						pluginId,
						widgetId: options.id,
						error: error instanceof Error ? error.message : String(error),
					},
					"Failed to render widget from Worker",
				);
				throw error;
			}
		};
	} else {
		renderFunction = options.render;
	}

	const entry: WidgetEntry = {
		pluginId,
		widgetId: options.id,
		name: options.name,
		description: options.description,
		position: options.position,
		size: options.size,
		render: renderFunction,
		icon: options.icon,
		isWorkerContext,
	};

	pluginWidgets.push(entry);
	widgets.set(pluginId, pluginWidgets);

	logger.info(
		{
			pluginId,
			widgetId: options.id,
			position: options.position,
			size: options.size,
			isWorkerContext,
			totalWidgets: pluginWidgets.length,
		},
		"Widget registered",
	);

	// Log to debug tools
	logPluginMessage(
		pluginId,
		"info",
		`Widgetを登録: ${options.name} (${options.id})`,
		{
			widgetId: options.id,
			name: options.name,
			position: options.position,
			size: options.size,
			icon: options.icon,
			isWorkerContext,
		},
	);
}

/**
 * Unregister a widget
 *
 * @param pluginId Plugin ID
 * @param widgetId Widget ID (optional, if not provided, all widgets for plugin are removed)
 * @returns True if widget was unregistered, false if not found
 */
export function unregisterWidget(pluginId: string, widgetId?: string): boolean {
	const pluginWidgets = widgets.get(pluginId);

	if (!pluginWidgets) {
		logger.warn({ pluginId }, "No widgets found for plugin");
		return false;
	}

	if (widgetId) {
		const index = pluginWidgets.findIndex(
			(widget) => widget.widgetId === widgetId,
		);

		if (index === -1) {
			logger.warn(
				{ pluginId, widgetId },
				"Widget not found for unregistration",
			);
			return false;
		}

		pluginWidgets.splice(index, 1);

		if (pluginWidgets.length === 0) {
			widgets.delete(pluginId);
		} else {
			widgets.set(pluginId, pluginWidgets);
		}

		logger.info({ pluginId, widgetId }, "Widget unregistered");
		return true;
	}

	// Remove all widgets for plugin
	widgets.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginWidgets.length },
		"All widgets unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Page Registration
// ============================================================================

/**
 * Register a custom page
 *
 * @param pluginId Plugin ID registering the page
 * @param options Page options
 * @throws Error if page ID already exists for this plugin or route is already used
 */
export function registerPage(pluginId: string, options: PageOptions): void {
	const pluginPages = pages.get(pluginId) ?? [];

	// Check if page ID already exists
	const existing = pluginPages.find((page) => page.pageId === options.id);

	if (existing) {
		throw new Error(
			`Page ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	// Check if route path is already used
	if (routeMap.has(options.route.path)) {
		const existingEntry = routeMap.get(options.route.path);
		throw new Error(
			`Page route "${options.route.path}" is already used by plugin ${existingEntry?.pluginId}`,
		);
	}

	const entry: PageEntry = {
		pluginId,
		pageId: options.id,
		route: options.route,
		render: options.render,
		description: options.description,
	};

	pluginPages.push(entry);
	pages.set(pluginId, pluginPages);
	routeMap.set(options.route.path, entry);

	logger.info(
		{
			pluginId,
			pageId: options.id,
			route: options.route.path,
		},
		"Page registered",
	);
}

/**
 * Unregister a custom page
 *
 * @param pluginId Plugin ID
 * @param pageId Page ID (optional, if not provided, all pages for plugin are removed)
 * @returns True if page was unregistered, false if not found
 */
export function unregisterPage(pluginId: string, pageId?: string): boolean {
	const pluginPages = pages.get(pluginId);

	if (!pluginPages) {
		logger.warn({ pluginId }, "No pages found for plugin");
		return false;
	}

	if (pageId) {
		const index = pluginPages.findIndex((page) => page.pageId === pageId);

		if (index === -1) {
			logger.warn({ pluginId, pageId }, "Page not found for unregistration");
			return false;
		}

		const entry = pluginPages[index];
		routeMap.delete(entry.route.path);
		pluginPages.splice(index, 1);

		if (pluginPages.length === 0) {
			pages.delete(pluginId);
		} else {
			pages.set(pluginId, pluginPages);
		}

		logger.info({ pluginId, pageId }, "Page unregistered");
		return true;
	}

	// Remove all pages for plugin
	for (const entry of pluginPages) {
		routeMap.delete(entry.route.path);
	}
	pages.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginPages.length },
		"All pages unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Sidebar Panel Registration
// ============================================================================

/**
 * Register a sidebar panel
 *
 * @param pluginId Plugin ID registering the panel
 * @param options Panel options
 * @throws Error if panel ID already exists for this plugin
 */
export function registerSidebarPanel(
	pluginId: string,
	options: SidebarPanelOptions,
): void {
	const pluginPanels = sidebarPanels.get(pluginId) ?? [];

	// Check if panel ID already exists
	const existing = pluginPanels.find((panel) => panel.panelId === options.id);

	if (existing) {
		throw new Error(
			`Sidebar panel ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	const entry: SidebarPanelEntry = {
		pluginId,
		panelId: options.id,
		name: options.name,
		description: options.description,
		position: options.position,
		render: options.render,
		icon: options.icon,
		defaultOpen: options.defaultOpen,
	};

	pluginPanels.push(entry);
	sidebarPanels.set(pluginId, pluginPanels);

	logger.info(
		{
			pluginId,
			panelId: options.id,
			position: options.position,
		},
		"Sidebar panel registered",
	);
}

/**
 * Unregister a sidebar panel
 *
 * @param pluginId Plugin ID
 * @param panelId Panel ID (optional, if not provided, all panels for plugin are removed)
 * @returns True if panel was unregistered, false if not found
 */
export function unregisterSidebarPanel(
	pluginId: string,
	panelId?: string,
): boolean {
	const pluginPanels = sidebarPanels.get(pluginId);

	if (!pluginPanels) {
		logger.warn({ pluginId }, "No sidebar panels found for plugin");
		return false;
	}

	if (panelId) {
		const index = pluginPanels.findIndex((panel) => panel.panelId === panelId);

		if (index === -1) {
			logger.warn(
				{ pluginId, panelId },
				"Sidebar panel not found for unregistration",
			);
			return false;
		}

		pluginPanels.splice(index, 1);

		if (pluginPanels.length === 0) {
			sidebarPanels.delete(pluginId);
		} else {
			sidebarPanels.set(pluginId, pluginPanels);
		}

		logger.info({ pluginId, panelId }, "Sidebar panel unregistered");
		return true;
	}

	// Remove all panels for plugin
	sidebarPanels.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginPanels.length },
		"All sidebar panels unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get widgets
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all widgets)
 * @param position Widget position filter (optional)
 * @returns Array of widget entries
 */
export function getWidgets(
	pluginId?: string,
	position?: WidgetOptions["position"],
): WidgetEntry[] {
	let result: WidgetEntry[] = [];

	if (pluginId) {
		result = widgets.get(pluginId) ?? [];
	} else {
		for (const pluginWidgets of widgets.values()) {
			result.push(...pluginWidgets);
		}
	}

	// Filter by position if provided
	if (position) {
		result = result.filter((widget) => widget.position === position);
	}

	return result;
}

/**
 * Get pages
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all pages)
 * @returns Array of page entries
 */
export function getPages(pluginId?: string): PageEntry[] {
	if (pluginId) {
		return pages.get(pluginId) ?? [];
	}

	const allPages: PageEntry[] = [];
	for (const pluginPages of pages.values()) {
		allPages.push(...pluginPages);
	}
	return allPages;
}

/**
 * Get page by route path
 *
 * @param path Route path
 * @returns Page entry or undefined if not found
 */
export function getPageByRoute(path: string): PageEntry | undefined {
	return routeMap.get(path);
}

/**
 * Get sidebar panels
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all panels)
 * @param position Panel position filter (optional)
 * @returns Array of sidebar panel entries
 */
export function getSidebarPanels(
	pluginId?: string,
	position?: SidebarPanelOptions["position"],
): SidebarPanelEntry[] {
	let result: SidebarPanelEntry[] = [];

	if (pluginId) {
		result = sidebarPanels.get(pluginId) ?? [];
	} else {
		for (const pluginPanels of sidebarPanels.values()) {
			result.push(...pluginPanels);
		}
	}

	// Filter by position if provided
	if (position) {
		result = result.filter((panel) => panel.position === position);
	}

	return result;
}

/**
 * Clear all extensions for a plugin
 *
 * @param pluginId Plugin ID
 */
export function clearPlugin(pluginId: string): void {
	unregisterWidget(pluginId);
	unregisterPage(pluginId);
	unregisterSidebarPanel(pluginId);
}

/**
 * Clear all extensions
 *
 * @warning This will remove all registered extensions!
 */
export function clear(): void {
	const widgetCount = Array.from(widgets.values()).reduce(
		(sum, widgets) => sum + widgets.length,
		0,
	);
	const pageCount = Array.from(pages.values()).reduce(
		(sum, pages) => sum + pages.length,
		0,
	);
	const panelCount = Array.from(sidebarPanels.values()).reduce(
		(sum, panels) => sum + panels.length,
		0,
	);

	widgets.clear();
	pages.clear();
	sidebarPanels.clear();
	routeMap.clear();

	logger.info(
		{
			clearedWidgets: widgetCount,
			clearedPages: pageCount,
			clearedPanels: panelCount,
		},
		"All UI extensions cleared",
	);
}

/**
 * Get statistics
 *
 * @returns Statistics about registered extensions
 */
export function getStats(): {
	totalPlugins: number;
	totalWidgets: number;
	totalPages: number;
	totalPanels: number;
} {
	return {
		totalPlugins: new Set([
			...widgets.keys(),
			...pages.keys(),
			...sidebarPanels.keys(),
		]).size,
		totalWidgets: Array.from(widgets.values()).reduce(
			(sum, widgets) => sum + widgets.length,
			0,
		),
		totalPages: Array.from(pages.values()).reduce(
			(sum, pages) => sum + pages.length,
			0,
		),
		totalPanels: Array.from(sidebarPanels.values()).reduce(
			(sum, panels) => sum + panels.length,
			0,
		),
	};
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset registry (for testing)
 */
export function reset(): void {
	widgets.clear();
	pages.clear();
	sidebarPanels.clear();
	routeMap.clear();
}
