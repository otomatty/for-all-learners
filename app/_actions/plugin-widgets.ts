/**
 * Plugin Widgets Server Actions (Placeholder for Tauri Migration)
 *
 * This file is a placeholder to allow imports in tests.
 * The actual implementation should be migrated to client-side hooks.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/_actions/__tests__/plugin-widgets.test.ts
 *
 * Dependencies (External files that this file imports):
 *   └─ lib/plugins/ui-registry.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 5.1)
 */

import logger from "@/lib/logger";
import type { WidgetOptions } from "@/lib/plugins/types";
import { getWidgets } from "@/lib/plugins/ui-registry";

/**
 * Get all registered widgets
 * @deprecated Use hooks/plugins/usePluginWidgets instead
 */
export function getAllWidgets(): Omit<
	ReturnType<typeof getWidgets>[number],
	"render"
>[] {
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
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			"Failed to get all widgets",
		);
		return [];
	}
}

/**
 * Get widgets by position
 * @deprecated Use hooks/plugins/usePluginWidgetsByPosition instead
 */
export function getWidgetsByPosition(
	position: WidgetOptions["position"],
): Omit<ReturnType<typeof getWidgets>[number], "render">[] {
	try {
		const widgets = getWidgets();
		return widgets
			.filter((widget) => widget.position === position)
			.map((widget) => ({
				pluginId: widget.pluginId,
				widgetId: widget.widgetId,
				name: widget.name,
				description: widget.description,
				position: widget.position,
				size: widget.size,
				icon: widget.icon,
			}));
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			"Failed to get widgets by position",
		);
		return [];
	}
}
