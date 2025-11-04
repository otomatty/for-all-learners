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
// Editor Extension Registry Class
// ============================================================================

/**
 * Editor Extension Registry
 *
 * Singleton registry for managing editor extensions registered by plugins.
 * Thread-safe operations with Map-based storage.
 */
export class EditorExtensionRegistry {
	private static instance: EditorExtensionRegistry | null = null;

	/** Map of plugin ID to array of extensions */
	private extensions: Map<string, EditorExtensionEntry[]>;

	/**
	 * Private constructor (Singleton pattern)
	 */
	private constructor() {
		this.extensions = new Map();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): EditorExtensionRegistry {
		if (!EditorExtensionRegistry.instance) {
			EditorExtensionRegistry.instance = new EditorExtensionRegistry();
		}
		return EditorExtensionRegistry.instance;
	}

	/**
	 * Reset registry (for testing)
	 */
	public static reset(): void {
		EditorExtensionRegistry.instance = null;
	}

	// ========================================================================
	// Registration Operations
	// ========================================================================

	/**
	 * Register an editor extension
	 *
	 * @param pluginId Plugin ID registering the extension
	 * @param options Extension options
	 * @throws Error if extension ID already exists for this plugin
	 */
	public register(
		pluginId: string,
		options: EditorExtensionOptions,
	): void {
		const pluginExtensions = this.extensions.get(pluginId) ?? [];

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
		this.extensions.set(pluginId, pluginExtensions);

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
	public unregister(pluginId: string, extensionId?: string): boolean {
		const pluginExtensions = this.extensions.get(pluginId);

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
				this.extensions.delete(pluginId);
			} else {
				this.extensions.set(pluginId, pluginExtensions);
			}

			logger.info(
				{ pluginId, extensionId },
				"Editor extension unregistered",
			);
			return true;
		}

		// Remove all extensions for plugin
		this.extensions.delete(pluginId);
		logger.info(
			{ pluginId, count: pluginExtensions.length },
			"All editor extensions unregistered for plugin",
		);
		return true;
	}

	// ========================================================================
	// Query Operations
	// ========================================================================

	/**
	 * Get all extensions for a plugin
	 *
	 * @param pluginId Plugin ID (optional, if not provided, returns all extensions)
	 * @returns Array of extension entries
	 */
	public getExtensions(pluginId?: string): EditorExtensionEntry[] {
		if (pluginId) {
			return this.extensions.get(pluginId) ?? [];
		}

		// Return all extensions
		const allExtensions: EditorExtensionEntry[] = [];
		for (const pluginExtensions of this.extensions.values()) {
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
	public getTiptapExtensions(pluginId?: string): Extension[] {
		const entries = this.getExtensions(pluginId);
		const extensions: Extension[] = [];

		for (const entry of entries) {
			if (Array.isArray(entry.extension)) {
				extensions.push(...entry.extension);
			} else {
				extensions.push(entry.extension);
			}
		}

		return extensions;
	}

	/**
	 * Check if plugin has extensions
	 *
	 * @param pluginId Plugin ID
	 * @returns True if plugin has registered extensions
	 */
	public hasExtensions(pluginId: string): boolean {
		const pluginExtensions = this.extensions.get(pluginId);
		return pluginExtensions !== undefined && pluginExtensions.length > 0;
	}

	/**
	 * Get extension by ID
	 *
	 * @param pluginId Plugin ID
	 * @param extensionId Extension ID
	 * @returns Extension entry or undefined if not found
	 */
	public getExtension(
		pluginId: string,
		extensionId: string,
	): EditorExtensionEntry | undefined {
		const pluginExtensions = this.extensions.get(pluginId);
		return pluginExtensions?.find((ext) => ext.extensionId === extensionId);
	}

	/**
	 * Clear all extensions for a plugin
	 *
	 * @param pluginId Plugin ID
	 */
	public clearPlugin(pluginId: string): void {
		this.unregister(pluginId);
	}

	/**
	 * Clear all extensions
	 *
	 * @warning This will remove all registered extensions!
	 */
	public clear(): void {
		const count = this.extensions.size;
		this.extensions.clear();
		logger.info({ clearedCount: count }, "All editor extensions cleared");
	}

	/**
	 * Get statistics
	 *
	 * @returns Statistics about registered extensions
	 */
	public getStats(): {
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

		for (const pluginExtensions of this.extensions.values()) {
			for (const ext of pluginExtensions) {
				totalExtensions++;
				extensionsByType[ext.type]++;
			}
		}

		return {
			totalPlugins: this.extensions.size,
			totalExtensions,
			extensionsByType,
		};
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get editor extension registry instance
 */
export function getEditorExtensionRegistry(): EditorExtensionRegistry {
	return EditorExtensionRegistry.getInstance();
}

