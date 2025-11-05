/**
 * Calendar Extension Registry
 *
 * Manages calendar extensions registered by plugins.
 * Provides registration, unregistration, and query capabilities for calendar extensions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-api.ts
 *   └─ app/_actions/activity_calendar.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/types.ts (Calendar extension types)
 *   └─ lib/logger
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/widget-calendar-extensions.md
 */

import logger from "@/lib/logger";
import type { CalendarExtensionData, CalendarExtensionOptions } from "./types";

// ============================================================================
// Calendar Extension Entry Types
// ============================================================================

/**
 * Calendar extension entry
 */
export interface CalendarExtensionEntry {
	pluginId: string;
	extensionId: string;
	name: string;
	description?: string;
	getDailyData: (date: string) => Promise<CalendarExtensionData | null>;
}

// ============================================================================
// State (Private)
// ============================================================================

/** Map of plugin ID to array of calendar extensions */
const calendarExtensions = new Map<string, CalendarExtensionEntry[]>();

// ============================================================================
// Calendar Extension Registration
// ============================================================================

/**
 * Register a calendar extension
 *
 * @param pluginId Plugin ID registering the extension
 * @param options Calendar extension options
 * @throws Error if extension ID already exists for this plugin
 */
export function registerCalendarExtension(
	pluginId: string,
	options: CalendarExtensionOptions,
): void {
	const pluginExtensions = calendarExtensions.get(pluginId) ?? [];

	// Check if extension ID already exists
	const existing = pluginExtensions.find(
		(ext) => ext.extensionId === options.id,
	);

	if (existing) {
		throw new Error(
			`Calendar extension ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	const entry: CalendarExtensionEntry = {
		pluginId,
		extensionId: options.id,
		name: options.name,
		description: options.description,
		getDailyData: options.getDailyData,
	};

	pluginExtensions.push(entry);
	calendarExtensions.set(pluginId, pluginExtensions);

	logger.info(
		{
			pluginId,
			extensionId: options.id,
			name: options.name,
		},
		"Calendar extension registered",
	);
}

/**
 * Unregister a calendar extension
 *
 * @param pluginId Plugin ID
 * @param extensionId Extension ID (optional, if not provided, all extensions for plugin are removed)
 * @returns True if extension was unregistered, false if not found
 */
export function unregisterCalendarExtension(
	pluginId: string,
	extensionId?: string,
): boolean {
	const pluginExtensions = calendarExtensions.get(pluginId);

	if (!pluginExtensions) {
		return false;
	}

	if (extensionId) {
		// Remove specific extension
		const index = pluginExtensions.findIndex(
			(ext) => ext.extensionId === extensionId,
		);

		if (index === -1) {
			return false;
		}

		pluginExtensions.splice(index, 1);

		if (pluginExtensions.length === 0) {
			calendarExtensions.delete(pluginId);
		} else {
			calendarExtensions.set(pluginId, pluginExtensions);
		}

		logger.info({ pluginId, extensionId }, "Calendar extension unregistered");
		return true;
	}

	// Remove all extensions for plugin
	calendarExtensions.delete(pluginId);
	logger.info({ pluginId }, "All calendar extensions unregistered for plugin");
	return true;
}

// ============================================================================
// Calendar Extension Queries
// ============================================================================

/**
 * Get all calendar extensions
 *
 * @param pluginId Optional plugin ID to filter by
 * @returns Array of calendar extension entries
 */
export function getCalendarExtensions(
	pluginId?: string,
): CalendarExtensionEntry[] {
	if (pluginId) {
		return calendarExtensions.get(pluginId) ?? [];
	}

	// Return all extensions from all plugins
	const result: CalendarExtensionEntry[] = [];
	for (const pluginExtensions of calendarExtensions.values()) {
		result.push(...pluginExtensions);
	}

	return result;
}

/**
 * Get daily data from all registered calendar extensions
 *
 * Uses Promise.allSettled to ensure that one failing extension doesn't
 * prevent other extensions from returning their data.
 *
 * @param date Date string (YYYY-MM-DD)
 * @returns Array of calendar extension data (filtered to remove nulls and failed results)
 */
export async function getDailyExtensionData(
	date: string,
): Promise<CalendarExtensionData[]> {
	const extensions = getCalendarExtensions();
	const results = await Promise.allSettled(
		extensions.map((ext) => ext.getDailyData(date)),
	);

	// Filter out null results and failed promises
	return results
		.filter(
			(
				result,
			): result is PromiseFulfilledResult<CalendarExtensionData | null> =>
				result.status === "fulfilled" && result.value !== null,
		)
		.map((result) => result.value as CalendarExtensionData);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear all extensions for a plugin
 *
 * @param pluginId Plugin ID
 */
export function clearPluginExtensions(pluginId: string): void {
	unregisterCalendarExtension(pluginId);
}

/**
 * Clear all extensions (for testing/reset)
 *
 * @warning This will remove all registered extensions!
 */
export function clear(): void {
	const extensionCount = Array.from(calendarExtensions.values()).reduce(
		(sum, extensions) => sum + extensions.length,
		0,
	);

	calendarExtensions.clear();

	logger.info({ extensionCount }, "All calendar extensions cleared");
}

/**
 * Reset registry (alias for clear, for consistency with other registries)
 */
export function reset(): void {
	clear();
}
