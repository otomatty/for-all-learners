"use server";

/**
 * Plugin Widget Server Actions
 *
 * Server Actions for fetching plugin widget metadata.
 * Note: Widget rendering is done on the client side because render functions
 * are executed in the plugin Worker context.
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

import logger from "@/lib/logger";
import { getWidgets, type WidgetEntry } from "@/lib/plugins/ui-registry";

/**
 * Get all registered widgets
 *
 * @returns Array of widget entries (metadata only, without render functions)
 */
export async function getAllWidgets(): Promise<Omit<WidgetEntry, "render">[]> {
	try {
		const widgets = getWidgets();
		// Return metadata only (render functions are not serializable)
		return widgets.map((widget) => ({
			pluginId: widget.pluginId,
			widgetId: widget.widgetId,
			name: widget.name,
			description: widget.description,
			position: widget.position,
			size: widget.size,
			icon: widget.icon,
		}));
	} catch (error) {
		logger.error({ error }, "Failed to get widgets");
		return [];
	}
}

/**
 * Get widgets by position
 *
 * @param position Widget position
 * @returns Array of widget entries (metadata only)
 */
export async function getWidgetsByPosition(
	position: "top-left" | "top-right" | "bottom-left" | "bottom-right",
): Promise<Omit<WidgetEntry, "render">[]> {
	try {
		const widgets = getWidgets(undefined, position);
		// Return metadata only (render functions are not serializable)
		return widgets.map((widget) => ({
			pluginId: widget.pluginId,
			widgetId: widget.widgetId,
			name: widget.name,
			description: widget.description,
			position: widget.position,
			size: widget.size,
			icon: widget.icon,
		}));
	} catch (error) {
		logger.error({ error, position }, "Failed to get widgets by position");
		return [];
	}
}
