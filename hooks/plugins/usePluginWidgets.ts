"use client";

import { useQuery } from "@tanstack/react-query";
import { getWidgets, type WidgetEntry } from "@/lib/plugins/ui-registry";

/**
 * Get all registered widgets
 */
export function usePluginWidgets() {
	return useQuery({
		queryKey: ["plugins", "widgets"],
		queryFn: async (): Promise<Omit<WidgetEntry, "render">[]> => {
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
		},
		staleTime: Infinity, // Widget metadata doesn't change frequently
	});
}

/**
 * Get widgets by position
 */
export function usePluginWidgetsByPosition(
	position: "top-left" | "top-right" | "bottom-left" | "bottom-right",
) {
	return useQuery({
		queryKey: ["plugins", "widgets", position],
		queryFn: async (): Promise<Omit<WidgetEntry, "render">[]> => {
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
		},
		staleTime: Infinity, // Widget metadata doesn't change frequently
		enabled: !!position,
	});
}
