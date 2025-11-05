"use client";

/**
 * Plugin Widgets Section Component
 *
 * Displays plugin widgets grouped by position on the dashboard.
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

import { useEffect, useState } from "react";
import { PluginWidgetContainer } from "@/components/plugins/PluginWidgetContainer";
import type { WidgetPosition } from "@/lib/plugins/types";
import { getWidgets } from "@/lib/plugins/ui-registry";

interface WidgetMetadata {
	pluginId: string;
	widgetId: string;
	name: string;
	description?: string;
	position: WidgetPosition;
	size: "small" | "medium" | "large";
	icon?: string;
}

const positionGroups: WidgetPosition[] = [
	"top-left",
	"top-right",
	"bottom-left",
	"bottom-right",
];

export function PluginWidgetsSection() {
	const [widgetsByPosition, setWidgetsByPosition] = useState<
		Record<WidgetPosition, WidgetMetadata[]>
	>({
		"top-left": [],
		"top-right": [],
		"bottom-left": [],
		"bottom-right": [],
	});

	useEffect(() => {
		// Get all widgets from registry
		const allWidgets = getWidgets();

		// Group by position
		const grouped: Record<WidgetPosition, WidgetMetadata[]> = {
			"top-left": [],
			"top-right": [],
			"bottom-left": [],
			"bottom-right": [],
		};

		for (const widget of allWidgets) {
			grouped[widget.position].push({
				pluginId: widget.pluginId,
				widgetId: widget.widgetId,
				name: widget.name,
				description: widget.description,
				position: widget.position,
				size: widget.size,
				icon: widget.icon,
			});
		}

		setWidgetsByPosition(grouped);
	}, []);

	// Check if there are any widgets
	const hasWidgets = Object.values(widgetsByPosition).some(
		(widgets) => widgets.length > 0,
	);

	if (!hasWidgets) {
		return null;
	}

	return (
		<div className="space-y-6">
			{positionGroups.map((position) => {
				const widgets = widgetsByPosition[position];
				if (widgets.length === 0) {
					return null;
				}

				return (
					<div key={position} className="space-y-2">
						<h3 className="text-sm font-semibold text-muted-foreground capitalize">
							{position.replace("-", " ")}
						</h3>
						<div className="grid grid-cols-3 gap-4">
							{widgets.map((widget) => (
								<PluginWidgetContainer
									key={`${widget.pluginId}-${widget.widgetId}`}
									pluginId={widget.pluginId}
									widgetId={widget.widgetId}
									name={widget.name}
									description={widget.description}
									size={widget.size}
									icon={widget.icon}
								/>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}
