/**
 * Plugin Registry
 *
 * Central registry for managing loaded plugins.
 * Provides CRUD operations and query capabilities for plugins.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-loader.ts
 *   └─ app/(protected)/settings/plugins/page.tsx
 *
 * Dependencies:
 *   ├─ types/plugin.ts (LoadedPlugin, ExtensionPoint)
 *   └─ lib/plugins/types.ts (PluginFilterOptions, PluginRegistryStats)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

import logger from "@/lib/logger";
import type { ExtensionPoint, LoadedPlugin } from "@/types/plugin";
import type { PluginFilterOptions, PluginRegistryStats } from "./types";

// ============================================================================
// Plugin Registry Class
// ============================================================================

/**
 * Plugin Registry
 *
 * Singleton registry for managing loaded plugins.
 * Thread-safe operations with Map-based storage.
 */
export class PluginRegistry {
	private static instance: PluginRegistry | null = null;

	/** Map of plugin ID to LoadedPlugin */
	private plugins: Map<string, LoadedPlugin>;

	/**
	 * Private constructor (Singleton pattern)
	 */
	private constructor() {
		this.plugins = new Map();
	}

	/**
	 * Get singleton instance
	 */
	public static getInstance(): PluginRegistry {
		if (!PluginRegistry.instance) {
			PluginRegistry.instance = new PluginRegistry();
		}
		return PluginRegistry.instance;
	}

	/**
	 * Reset registry (for testing)
	 */
	public static reset(): void {
		PluginRegistry.instance = null;
	}

	// ========================================================================
	// CRUD Operations
	// ========================================================================

	/**
	 * Register a plugin
	 *
	 * @param plugin LoadedPlugin instance
	 * @throws Error if plugin ID is already registered
	 */
	public register(plugin: LoadedPlugin): void {
		const pluginId = plugin.manifest.id;

		if (this.plugins.has(pluginId)) {
			throw new Error(`Plugin ${pluginId} is already registered`);
		}

		this.plugins.set(pluginId, plugin);
		logger.info(
			{
				pluginId,
				pluginName: plugin.manifest.name,
				version: plugin.manifest.version,
			},
			"Plugin registered",
		);
	}

	/**
	 * Unregister a plugin
	 *
	 * @param pluginId Plugin ID to unregister
	 * @returns True if plugin was unregistered, false if not found
	 */
	public unregister(pluginId: string): boolean {
		const existed = this.plugins.delete(pluginId);

		if (existed) {
			logger.info({ pluginId }, "Plugin unregistered");
		} else {
			logger.warn({ pluginId }, "Plugin not found for unregistration");
		}

		return existed;
	}

	/**
	 * Update plugin
	 *
	 * @param pluginId Plugin ID
	 * @param updates Partial updates to apply
	 * @throws Error if plugin not found
	 */
	public update(pluginId: string, updates: Partial<LoadedPlugin>): void {
		const plugin = this.plugins.get(pluginId);

		if (!plugin) {
			throw new Error(`Plugin ${pluginId} not found`);
		}

		const updated = {
			...plugin,
			...updates,
		};

		this.plugins.set(pluginId, updated);
		logger.info(
			{
				pluginId,
				updates: Object.keys(updates),
			},
			"Plugin updated",
		);
	}

	/**
	 * Get plugin by ID
	 *
	 * @param pluginId Plugin ID
	 * @returns LoadedPlugin or undefined if not found
	 */
	public get(pluginId: string): LoadedPlugin | undefined {
		return this.plugins.get(pluginId);
	}

	/**
	 * Check if plugin exists
	 *
	 * @param pluginId Plugin ID
	 * @returns True if plugin is registered
	 */
	public has(pluginId: string): boolean {
		return this.plugins.has(pluginId);
	}

	// ========================================================================
	// Query Operations
	// ========================================================================

	/**
	 * Get all plugins
	 *
	 * @returns Array of all LoadedPlugins
	 */
	public getAll(): LoadedPlugin[] {
		return Array.from(this.plugins.values());
	}

	/**
	 * Get plugins by extension point
	 *
	 * @param extensionPoint Extension point to filter by
	 * @returns Array of plugins providing the extension point
	 */
	public getByExtensionPoint(extensionPoint: ExtensionPoint): LoadedPlugin[] {
		return this.getAll().filter((plugin) => {
			return plugin.manifest.extensionPoints[extensionPoint] === true;
		});
	}

	/**
	 * Get enabled plugins
	 *
	 * @returns Array of enabled plugins
	 */
	public getEnabled(): LoadedPlugin[] {
		return this.getAll().filter((plugin) => plugin.enabled);
	}

	/**
	 * Get disabled plugins
	 *
	 * @returns Array of disabled plugins
	 */
	public getDisabled(): LoadedPlugin[] {
		return this.getAll().filter((plugin) => !plugin.enabled);
	}

	/**
	 * Filter plugins
	 *
	 * @param options Filter options
	 * @returns Array of filtered plugins
	 */
	public filter(options: PluginFilterOptions): LoadedPlugin[] {
		let plugins = this.getAll();

		// Filter by extension point
		if (options.extensionPoint) {
			const extensionPoint = options.extensionPoint;
			plugins = plugins.filter(
				(p) => p.manifest.extensionPoints[extensionPoint] === true,
			);
		}

		// Filter by enabled state
		if (options.enabled !== undefined) {
			plugins = plugins.filter((p) => p.enabled === options.enabled);
		}

		// Filter by search query
		if (options.query) {
			const query = options.query.toLowerCase();
			plugins = plugins.filter(
				(p) =>
					p.manifest.name.toLowerCase().includes(query) ||
					p.manifest.description.toLowerCase().includes(query) ||
					p.manifest.author.toLowerCase().includes(query),
			);
		}

		return plugins;
	}

	/**
	 * Search plugins
	 *
	 * @param query Search query (name, description, author)
	 * @returns Array of matching plugins
	 */
	public search(query: string): LoadedPlugin[] {
		return this.filter({ query });
	}

	// ========================================================================
	// Statistics
	// ========================================================================

	/**
	 * Get registry statistics
	 *
	 * @returns Statistics about registered plugins
	 */
	public getStats(): PluginRegistryStats {
		const all = this.getAll();
		const enabled = this.getEnabled();

		const pluginsByExtensionPoint: Record<ExtensionPoint, number> = {
			editor: this.getByExtensionPoint("editor").length,
			ai: this.getByExtensionPoint("ai").length,
			ui: this.getByExtensionPoint("ui").length,
			dataProcessor: this.getByExtensionPoint("dataProcessor").length,
			integration: this.getByExtensionPoint("integration").length,
		};

		return {
			totalPlugins: all.length,
			enabledPlugins: enabled.length,
			disabledPlugins: all.length - enabled.length,
			pluginsByExtensionPoint,
		};
	}

	/**
	 * Get total plugin count
	 */
	public count(): number {
		return this.plugins.size;
	}

	/**
	 * Clear all plugins
	 *
	 * @warning This will remove all registered plugins!
	 */
	public clear(): void {
		const count = this.plugins.size;
		this.plugins.clear();
		logger.info({ clearedCount: count }, "All plugins cleared");
	}

	// ========================================================================
	// State Management
	// ========================================================================

	/**
	 * Enable plugin
	 *
	 * @param pluginId Plugin ID
	 * @throws Error if plugin not found
	 */
	public enable(pluginId: string): void {
		const plugin = this.get(pluginId);

		if (!plugin) {
			throw new Error(`Plugin ${pluginId} not found`);
		}

		if (plugin.enabled) {
			logger.warn({ pluginId }, "Plugin is already enabled");
			return;
		}

		this.update(pluginId, { enabled: true });
	}

	/**
	 * Disable plugin
	 *
	 * @param pluginId Plugin ID
	 * @throws Error if plugin not found
	 */
	public disable(pluginId: string): void {
		const plugin = this.get(pluginId);

		if (!plugin) {
			throw new Error(`Plugin ${pluginId} not found`);
		}

		if (!plugin.enabled) {
			logger.warn({ pluginId }, "Plugin is already disabled");
			return;
		}

		this.update(pluginId, { enabled: false });
	}

	/**
	 * Toggle plugin enabled state
	 *
	 * @param pluginId Plugin ID
	 * @returns New enabled state
	 * @throws Error if plugin not found
	 */
	public toggle(pluginId: string): boolean {
		const plugin = this.get(pluginId);

		if (!plugin) {
			throw new Error(`Plugin ${pluginId} not found`);
		}

		const newState = !plugin.enabled;
		this.update(pluginId, { enabled: newState });

		return newState;
	}

	// ========================================================================
	// Error Management
	// ========================================================================

	/**
	 * Set plugin error state
	 *
	 * @param pluginId Plugin ID
	 * @param error Error message
	 */
	public setError(pluginId: string, error: string): void {
		const plugin = this.get(pluginId);

		if (!plugin) {
			logger.warn({ pluginId }, "Cannot set error for non-existent plugin");
			return;
		}

		this.update(pluginId, { error });
		logger.error({ pluginId, error }, "Plugin error set");
	}

	/**
	 * Clear plugin error state
	 *
	 * @param pluginId Plugin ID
	 */
	public clearError(pluginId: string): void {
		const plugin = this.get(pluginId);

		if (!plugin) {
			return;
		}

		this.update(pluginId, { error: undefined });
	}

	/**
	 * Get plugins with errors
	 *
	 * @returns Array of plugins that have errors
	 */
	public getWithErrors(): LoadedPlugin[] {
		return this.getAll().filter((p) => p.error !== undefined);
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Get plugin registry instance
 */
export function getPluginRegistry(): PluginRegistry {
	return PluginRegistry.getInstance();
}
