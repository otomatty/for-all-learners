"use client";

/**
 * Plugin Widget Container Component
 *
 * Container component for a plugin widget with size and styling.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/dashboard/_components/PluginWidgetsSection.tsx
 *
 * Dependencies:
 *   ├─ components/plugins/PluginWidgetRenderer.tsx
 *   └─ lib/plugins/types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { WidgetSize } from "@/lib/plugins/types";
import { PluginWidgetRenderer } from "./PluginWidgetRenderer";

interface PluginWidgetContainerProps {
	pluginId: string;
	widgetId: string;
	name: string;
	description?: string;
	size: WidgetSize;
	icon?: string;
}

const sizeClasses: Record<WidgetSize, string> = {
	small: "col-span-1",
	medium: "col-span-2",
	large: "col-span-3",
};

export function PluginWidgetContainer({
	pluginId,
	widgetId,
	name,
	description,
	size,
	icon,
}: PluginWidgetContainerProps) {
	return (
		<Card className={sizeClasses[size]}>
			<CardHeader>
				<div className="flex items-center gap-2">
					{icon && (
						<span className="text-lg" aria-hidden="true">
							{icon}
						</span>
					)}
					<CardTitle className="text-base">{name}</CardTitle>
				</div>
				{description && (
					<CardDescription className="text-xs">{description}</CardDescription>
				)}
			</CardHeader>
			<CardContent>
				<PluginWidgetRenderer pluginId={pluginId} widgetId={widgetId} />
			</CardContent>
		</Card>
	);
}
