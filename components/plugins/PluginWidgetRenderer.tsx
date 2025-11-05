"use client";

/**
 * Plugin Widget Renderer Component
 *
 * Renders a plugin widget by calling its render function and displaying the result.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ components/plugins/PluginWidgetContainer.tsx
 *
 * Dependencies:
 *   ├─ lib/plugins/ui-registry.ts
 *   └─ lib/plugins/types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import { useEffect, useState } from "react";
import type { WidgetRenderResult } from "@/lib/plugins/types";
import { getWidgets } from "@/lib/plugins/ui-registry";
import { type WidgetComponentType, WidgetRenderer } from "./widget-renderers";

interface PluginWidgetRendererProps {
	pluginId: string;
	widgetId: string;
}

export function PluginWidgetRenderer({
	pluginId,
	widgetId,
}: PluginWidgetRendererProps) {
	const [renderResult, setRenderResult] = useState<WidgetRenderResult | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		async function renderWidget() {
			try {
				setLoading(true);
				setError(null);

				// Get widget from registry
				const widgets = getWidgets(pluginId);
				const widget = widgets.find((w) => w.widgetId === widgetId);

				if (!widget) {
					if (mounted) {
						setError(`Widget ${widgetId} not found`);
						setLoading(false);
					}
					return;
				}

				// Get widget config from plugin storage
				// For now, we'll use empty config
				const config = {};

				// Call render function
				const result = await widget.render({
					pluginId,
					widgetId,
					config,
				});

				if (mounted) {
					setRenderResult(result);
					setLoading(false);
				}
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error ? err.message : "Failed to render widget",
					);
					setLoading(false);
				}
			}
		}

		renderWidget();

		return () => {
			mounted = false;
		};
	}, [pluginId, widgetId]);

	if (loading) {
		return (
			<div className="flex items-center justify-center p-4">
				<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-4 text-sm text-destructive">
				<p>Error: {error}</p>
			</div>
		);
	}

	if (!renderResult) {
		return null;
	}

	// Render based on result type
	// Note: HTML rendering is not supported for security reasons.
	// Plugins should use props-based rendering with defined component types instead.
	if (renderResult.html) {
		// HTML rendering is disabled for security reasons
		// Plugins should use props-based rendering instead
		return (
			<div className="p-4 text-sm text-muted-foreground">
				<p>
					HTML rendering is not supported. Please use props-based rendering with
					defined component types (e.g., "stat-card", "metric", "list", "text").
				</p>
			</div>
		);
	}

	// Component-based rendering using type system
	// Supported types: "stat-card", "metric", "list", "text", "custom"
	const validTypes: WidgetComponentType[] = [
		"stat-card",
		"metric",
		"list",
		"text",
		"custom",
	];
	const widgetType: WidgetComponentType =
		renderResult.type &&
		validTypes.includes(renderResult.type as WidgetComponentType)
			? (renderResult.type as WidgetComponentType)
			: "custom";
	return <WidgetRenderer type={widgetType} props={renderResult.props} />;
}
