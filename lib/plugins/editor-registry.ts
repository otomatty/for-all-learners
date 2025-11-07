/**
 * Editor Extension Registry
 *
 * Manages editor extensions registered by plugins.
 * Provides registration, unregistration, and query capabilities for editor extensions.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/editor-manager.ts
 *   └─ lib/plugins/plugin-api.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/types.ts (EditorExtensionOptions)
 *   └─ @tiptap/core (Extension type)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase2-editor-extensions.md
 */

import type { Extension } from "@tiptap/core";
import logger from "@/lib/logger";
import type { EditorExtensionOptions } from "./types";

// ============================================================================
// Editor Extension Entry
// ============================================================================

/**
 * Registered editor extension entry
 */
export interface EditorExtensionEntry {
	/** Plugin ID that registered this extension */
	pluginId: string;

	/** Extension ID (unique within plugin) */
	extensionId: string;

	/** Tiptap Extension or array of Extensions */
	extension: Extension | Extension[];

	/** Extension type */
	type: "node" | "mark" | "plugin";
}

// ============================================================================
// State (Private)
// ============================================================================

/** Map of plugin ID to array of extensions */
const extensions = new Map<string, EditorExtensionEntry[]>();

// ============================================================================
// Registration Operations
// ============================================================================

/**
 * Register an editor extension
 *
 * @param pluginId Plugin ID registering the extension
 * @param options Extension options
 * @throws Error if extension ID already exists for this plugin
 */
export function register(
	pluginId: string,
	options: EditorExtensionOptions,
): void {
	const pluginExtensions = extensions.get(pluginId) ?? [];

	// Check if extension ID already exists
	const existing = pluginExtensions.find(
		(ext) => ext.extensionId === options.id,
	);

	if (existing) {
		throw new Error(
			`Extension ${options.id} already registered for plugin ${pluginId}`,
		);
	}

	// Validate extension type
	if (!["node", "mark", "plugin"].includes(options.type)) {
		throw new Error(
			`Invalid extension type: ${options.type}. Must be 'node', 'mark', or 'plugin'`,
		);
	}

	const entry: EditorExtensionEntry = {
		pluginId,
		extensionId: options.id,
		extension: options.extension as Extension | Extension[],
		type: options.type,
	};

	pluginExtensions.push(entry);
	extensions.set(pluginId, pluginExtensions);

	logger.info(
		{
			pluginId,
			extensionId: options.id,
			type: options.type,
		},
		"Editor extension registered",
	);
}

/**
 * Unregister an extension
 *
 * @param pluginId Plugin ID
 * @param extensionId Extension ID (optional, if not provided, all extensions for plugin are removed)
 * @returns True if extension was unregistered, false if not found
 */
export function unregister(pluginId: string, extensionId?: string): boolean {
	const pluginExtensions = extensions.get(pluginId);

	if (!pluginExtensions) {
		logger.warn({ pluginId }, "No extensions found for plugin");
		return false;
	}

	if (extensionId) {
		// Remove specific extension
		const index = pluginExtensions.findIndex(
			(ext) => ext.extensionId === extensionId,
		);

		if (index === -1) {
			logger.warn(
				{ pluginId, extensionId },
				"Extension not found for unregistration",
			);
			return false;
		}

		pluginExtensions.splice(index, 1);

		if (pluginExtensions.length === 0) {
			extensions.delete(pluginId);
		} else {
			extensions.set(pluginId, pluginExtensions);
		}

		logger.info({ pluginId, extensionId }, "Editor extension unregistered");
		return true;
	}

	// Remove all extensions for plugin
	extensions.delete(pluginId);
	logger.info(
		{ pluginId, count: pluginExtensions.length },
		"All editor extensions unregistered for plugin",
	);
	return true;
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all extensions for a plugin
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all extensions)
 * @returns Array of extension entries
 */
export function getExtensions(pluginId?: string): EditorExtensionEntry[] {
	if (pluginId) {
		return extensions.get(pluginId) ?? [];
	}

	// Return all extensions
	const allExtensions: EditorExtensionEntry[] = [];
	for (const pluginExtensions of extensions.values()) {
		allExtensions.push(...pluginExtensions);
	}
	return allExtensions;
}

/**
 * Get Tiptap Extension instances for a plugin
 *
 * @param pluginId Plugin ID (optional, if not provided, returns all extensions)
 * @returns Array of Tiptap Extensions (flattened if array)
 */
export function getTiptapExtensions(pluginId?: string): Extension[] {
	const entries = getExtensions(pluginId);
	const result: Extension[] = [];

	for (const entry of entries) {
		if (Array.isArray(entry.extension)) {
			result.push(...entry.extension);
		} else {
			result.push(entry.extension);
		}
	}

	return result;
}

/**
 * Check if plugin has extensions
 *
 * @param pluginId Plugin ID
 * @returns True if plugin has registered extensions
 */
export function hasExtensions(pluginId: string): boolean {
	const pluginExtensions = extensions.get(pluginId);
	return pluginExtensions !== undefined && pluginExtensions.length > 0;
}

/**
 * Get extension by ID
 *
 * @param pluginId Plugin ID
 * @param extensionId Extension ID
 * @returns Extension entry or undefined if not found
 */
export function getExtension(
	pluginId: string,
	extensionId: string,
): EditorExtensionEntry | undefined {
	const pluginExtensions = extensions.get(pluginId);
	return pluginExtensions?.find((ext) => ext.extensionId === extensionId);
}

/**
 * Clear all extensions for a plugin
 *
 * @param pluginId Plugin ID
 */
export function clearPlugin(pluginId: string): void {
	unregister(pluginId);
}

/**
 * Clear all extensions
 *
 * @warning This will remove all registered extensions!
 */
export function clear(): void {
	const count = extensions.size;
	extensions.clear();
	logger.info({ clearedCount: count }, "All editor extensions cleared");
}

/**
 * Get statistics
 *
 * @returns Statistics about registered extensions
 */
export function getStats(): {
	totalPlugins: number;
	totalExtensions: number;
	extensionsByType: Record<"node" | "mark" | "plugin", number>;
} {
	let totalExtensions = 0;
	const extensionsByType: Record<"node" | "mark" | "plugin", number> = {
		node: 0,
		mark: 0,
		plugin: 0,
	};

	for (const pluginExtensions of extensions.values()) {
		for (const ext of pluginExtensions) {
			totalExtensions++;
			extensionsByType[ext.type]++;
		}
	}

	return {
		totalPlugins: extensions.size,
		totalExtensions,
		extensionsByType,
	};
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset registry (for testing)
 */
export function reset(): void {
	extensions.clear();
}
