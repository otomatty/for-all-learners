/**
 * Widget Renderer Components
 *
 * Pre-defined widget component types that plugins can use.
 * Each type has a specific structure for props.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ components/plugins/PluginWidgetRenderer.tsx
 *
 * Dependencies:
 *   └─ components/ui/*
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { StatCard } from "./StatCard";
import { Metric } from "./Metric";
import { List } from "./List";
import { Text } from "./Text";

export type WidgetComponentType =
	| "stat-card"
	| "metric"
	| "list"
	| "text"
	| "custom";

export interface WidgetRendererProps {
	type: WidgetComponentType;
	props?: Record<string, unknown>;
}

/**
 * Render a widget based on its type
 */
export function WidgetRenderer({ type, props }: WidgetRendererProps) {
	const safeProps = props || {};

	switch (type) {
		case "stat-card":
			return (
				<StatCard
					{...(safeProps as unknown as Parameters<typeof StatCard>[0])}
				/>
			);
		case "metric":
			return (
				<Metric {...(safeProps as unknown as Parameters<typeof Metric>[0])} />
			);
		case "list":
			return <List {...(safeProps as unknown as Parameters<typeof List>[0])} />;
		case "text":
			return <Text {...(safeProps as unknown as Parameters<typeof Text>[0])} />;
		default:
			// Fallback to custom rendering
			return (
				<div className="widget-content">
					{props && (
						<div className="widget-props">
							{Object.entries(props).map(([key, value]) => (
								<div key={key} className="text-sm">
									<span className="font-medium">{key}:</span>{" "}
									<span className="text-muted-foreground">
										{typeof value === "object"
											? JSON.stringify(value)
											: String(value)}
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			);
	}
}

export { StatCard, Metric, List, Text };
