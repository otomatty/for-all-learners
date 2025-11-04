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
import type { PageOptions, SidebarPanelOptions, WidgetOptions } from "./types";

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
// UI Extension Registry Class
// ============================================================================

/**
 * UI Extension Registry
 *
 * Singleton registry for managing UI extensions registered by plugins.
 * Thread-safe operations with Map-based storage.
 */
export class UIExtensionRegistry {
	private static instance: UIExtensionRegistry | null = null;

	/** Map of plugin ID to array of widgets */
	private widgets: Map<string, WidgetEntry[]>;

	/** Map of plugin ID to array of pages */
	private pages: Map<string, PageEntry[]>;

	/** Map of plugin ID to array of sidebar panels */
	private sidebarPanels: Map<string, SidebarPanelEntry[]>;

	/** Map of route path to page entry (for quick lookup) */
	private routeMap: Map<string, PageEntry>;

	/**
	 * Private constructor (Singleton pattern)
	 */
	private constructor() {
		this.widgets = new Map();
		this.pages = new Map();
		this.sidebarPanels = new Map();
		this.routeMap = new Map();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): UIExtensionRegistry {
		if (!UIExtensionRegistry.instance) {
			UIExtensionRegistry.instance = new UIExtensionRegistry();
		}
		return UIExtensionRegistry.instance;
	}

	/**
	 * Reset registry (for testing)
	 */
	public static reset(): void {
		UIExtensionRegistry.instance = null;
	}

	// ========================================================================
	// Widget Registration
	// ========================================================================

	/**
	 * Register a widget
	 *
	 * @param pluginId Plugin ID registering the widget
	 * @param options Widget options
	 * @throws Error if widget ID already exists for this plugin
	 */
	public registerWidget(pluginId: string, options: WidgetOptions): void {
		const pluginWidgets = this.widgets.get(pluginId) ?? [];

		// Check if widget ID already exists
		const existing = pluginWidgets.find(
			(widget) => widget.widgetId === options.id,
		);

		if (existing) {
			throw new Error(
				`Widget ${options.id} already registered for plugin ${pluginId}`,
			);
		}

		const entry: WidgetEntry = {
			pluginId,
			widgetId: options.id,
			name: options.name,
			description: options.description,
			position: options.position,
			size: options.size,
			render: options.render,
			icon: options.icon,
		};

		pluginWidgets.push(entry);
		this.widgets.set(pluginId, pluginWidgets);

		logger.info(
			{
				pluginId,
				widgetId: options.id,
				position: options.position,
				size: options.size,
			},
			"Widget registered",
		);
	}

	/**
	 * Unregister a widget
	 *
	 * @param pluginId Plugin ID
	 * @param widgetId Widget ID (optional, if not provided, all widgets for plugin are removed)
	 * @returns True if widget was unregistered, false if not found
	 */
	public unregisterWidget(pluginId: string, widgetId?: string): boolean {
		const pluginWidgets = this.widgets.get(pluginId);

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
				this.widgets.delete(pluginId);
			} else {
				this.widgets.set(pluginId, pluginWidgets);
			}

			logger.info({ pluginId, widgetId }, "Widget unregistered");
			return true;
		}

		// Remove all widgets for plugin
		this.widgets.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginWidgets.length },
			"All widgets unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Page Registration
	// ========================================================================

	/**
	 * Register a custom page
	 *
	 * @param pluginId Plugin ID registering the page
	 * @param options Page options
	 * @throws Error if page ID already exists for this plugin or route is already used
	 */
	public registerPage(pluginId: string, options: PageOptions): void {
		const pluginPages = this.pages.get(pluginId) ?? [];

		// Check if page ID already exists
		const existing = pluginPages.find((page) => page.pageId === options.id);

		if (existing) {
			throw new Error(
				`Page ${options.id} already registered for plugin ${pluginId}`,
			);
		}

		// Check if route path is already used
		if (this.routeMap.has(options.route.path)) {
			const existingEntry = this.routeMap.get(options.route.path);
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
		this.pages.set(pluginId, pluginPages);
		this.routeMap.set(options.route.path, entry);

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
	public unregisterPage(pluginId: string, pageId?: string): boolean {
		const pluginPages = this.pages.get(pluginId);

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
			this.routeMap.delete(entry.route.path);
			pluginPages.splice(index, 1);

			if (pluginPages.length === 0) {
				this.pages.delete(pluginId);
			} else {
				this.pages.set(pluginId, pluginPages);
			}

			logger.info({ pluginId, pageId }, "Page unregistered");
			return true;
		}

		// Remove all pages for plugin
		for (const entry of pluginPages) {
			this.routeMap.delete(entry.route.path);
		}
		this.pages.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginPages.length },
			"All pages unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Sidebar Panel Registration
	// ========================================================================

	/**
	 * Register a sidebar panel
	 *
	 * @param pluginId Plugin ID registering the panel
	 * @param options Panel options
	 * @throws Error if panel ID already exists for this plugin
	 */
	public registerSidebarPanel(
		pluginId: string,
		options: SidebarPanelOptions,
	): void {
		const pluginPanels = this.sidebarPanels.get(pluginId) ?? [];

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
		this.sidebarPanels.set(pluginId, pluginPanels);

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
	public unregisterSidebarPanel(pluginId: string, panelId?: string): boolean {
		const pluginPanels = this.sidebarPanels.get(pluginId);

		if (!pluginPanels) {
			logger.warn({ pluginId }, "No sidebar panels found for plugin");
			return false;
		}

		if (panelId) {
			const index = pluginPanels.findIndex(
				(panel) => panel.panelId === panelId,
			);

			if (index === -1) {
				logger.warn(
					{ pluginId, panelId },
					"Sidebar panel not found for unregistration",
				);
				return false;
			}

			pluginPanels.splice(index, 1);

			if (pluginPanels.length === 0) {
				this.sidebarPanels.delete(pluginId);
			} else {
				this.sidebarPanels.set(pluginId, pluginPanels);
			}

			logger.info({ pluginId, panelId }, "Sidebar panel unregistered");
			return true;
		}

		// Remove all panels for plugin
		this.sidebarPanels.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginPanels.length },
			"All sidebar panels unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Query Operations
	// ========================================================================

	/**
	 * Get widgets
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all widgets)
	 * @param position Widget position filter (optional)
	 * @returns Array of widget entries
	 */
	public getWidgets(
		pluginId?: string,
		position?: WidgetOptions["position"],
	): WidgetEntry[] {
		let widgets: WidgetEntry[] = [];

		if (pluginId) {
			widgets = this.widgets.get(pluginId) ?? [];
		} else {
			for (const pluginWidgets of this.widgets.values()) {
				widgets.push(...pluginWidgets);
			}
		}

		// Filter by position if provided
		if (position) {
			widgets = widgets.filter((widget) => widget.position === position);
		}

		return widgets;
	}

	/**
	 * Get pages
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all pages)
	 * @returns Array of page entries
	 */
	public getPages(pluginId?: string): PageEntry[] {
		if (pluginId) {
			return this.pages.get(pluginId) ?? [];
		}

		const allPages: PageEntry[] = [];
		for (const pluginPages of this.pages.values()) {
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
	public getPageByRoute(path: string): PageEntry | undefined {
		return this.routeMap.get(path);
	}

	/**
	 * Get sidebar panels
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all panels)
	 * @param position Panel position filter (optional)
	 * @returns Array of sidebar panel entries
	 */
	public getSidebarPanels(
		pluginId?: string,
		position?: SidebarPanelOptions["position"],
	): SidebarPanelEntry[] {
		let panels: SidebarPanelEntry[] = [];

		if (pluginId) {
			panels = this.sidebarPanels.get(pluginId) ?? [];
		} else {
			for (const pluginPanels of this.sidebarPanels.values()) {
				panels.push(...pluginPanels);
			}
		}

		// Filter by position if provided
		if (position) {
			panels = panels.filter((panel) => panel.position === position);
		}

		return panels;
	}

	/**
	 * Clear all extensions for a plugin
	 *
	 * @param pluginId Plugin ID
	 */
	public clearPlugin(pluginId: string): void {
		this.unregisterWidget(pluginId);
		this.unregisterPage(pluginId);
		this.unregisterSidebarPanel(pluginId);
	}

	/**
	 * Clear all extensions
	 *
	 * @warning This will remove all registered extensions!
	 */
	public clear(): void {
		const widgetCount = Array.from(this.widgets.values()).reduce(
			(sum, widgets) => sum + widgets.length,
			0,
		);
		const pageCount = Array.from(this.pages.values()).reduce(
			(sum, pages) => sum + pages.length,
			0,
		);
		const panelCount = Array.from(this.sidebarPanels.values()).reduce(
			(sum, panels) => sum + panels.length,
			0,
		);

		this.widgets.clear();
		this.pages.clear();
		this.sidebarPanels.clear();
		this.routeMap.clear();

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
	public getStats(): {
		totalPlugins: number;
		totalWidgets: number;
		totalPages: number;
		totalPanels: number;
	} {
		return {
			totalPlugins: new Set([
				...this.widgets.keys(),
				...this.pages.keys(),
				...this.sidebarPanels.keys(),
			]).size,
			totalWidgets: Array.from(this.widgets.values()).reduce(
				(sum, widgets) => sum + widgets.length,
				0,
			),
			totalPages: Array.from(this.pages.values()).reduce(
				(sum, pages) => sum + pages.length,
				0,
			),
			totalPanels: Array.from(this.sidebarPanels.values()).reduce(
				(sum, panels) => sum + panels.length,
				0,
			),
		};
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get UI extension registry instance
 */
export function getUIExtensionRegistry(): UIExtensionRegistry {
	return UIExtensionRegistry.getInstance();
}
