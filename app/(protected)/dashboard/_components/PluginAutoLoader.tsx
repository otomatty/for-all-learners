/**
 * Plugin Auto Loader Component
 *
 * Automatically loads all installed and enabled plugins on app startup.
 * This component should be mounted once in the app root or dashboard page.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/dashboard/page.tsx
 *
 * Dependencies (External files that this imports):
 *   ├─ hooks/plugins/useInstalledPlugins
 *   ├─ lib/hooks/use-load-plugin.ts
 *   └─ lib/plugins/plugin-registry.ts
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251106_02_plugin-loading-issues.md
 *   └─ PR #179: Plugin CRUD Migration
 */

"use client";

import { useEffect, useRef } from "react";
import { useInstalledPlugins } from "@/hooks/plugins";
import { useLoadPlugin } from "@/lib/hooks/use-load-plugin";
import logger from "@/lib/logger";
import { getPluginRegistry } from "@/lib/plugins/plugin-registry";

/**
 * Plugin Auto Loader Component
 *
 * Loads all installed and enabled plugins on mount.
 * This component runs only once on mount to avoid infinite loops.
 */
export function PluginAutoLoader() {
	const { loadPlugin } = useLoadPlugin();
	const { data: installedPlugins } = useInstalledPlugins();
	const hasLoadedRef = useRef(false);

	useEffect(() => {
		// Only run once on mount and when plugins are loaded
		if (hasLoadedRef.current || !installedPlugins) {
			return;
		}
		hasLoadedRef.current = true;

		let mounted = true;

		async function loadInstalledPlugins() {
			try {
				// Filter only enabled plugins
				const enabledPlugins = installedPlugins.filter((p) => p.enabled);

				// Get already loaded plugins
				const registry = getPluginRegistry();
				const alreadyLoaded = new Set(
					Array.from(registry.getAll()).map((p) => p.manifest.id),
				);

				// Load each enabled plugin that isn't already loaded
				const loadPromises = enabledPlugins
					.filter((p) => !alreadyLoaded.has(p.pluginId))
					.map(async (userPlugin) => {
						const plugin = userPlugin.metadata;

						try {
							const result = await loadPlugin(plugin);
							if (result.success && mounted) {
								logger.info(
									{ pluginId: plugin.pluginId },
									"Plugin auto-loaded successfully",
								);
							} else if (!result.success) {
								logger.warn(
									{ pluginId: plugin.pluginId, error: result.error },
									"Failed to auto-load plugin",
								);
							}
						} catch (error) {
							logger.error(
								{ error, pluginId: plugin.pluginId },
								"Error auto-loading plugin",
							);
						}
					});

				await Promise.allSettled(loadPromises);
			} catch (error) {
				logger.error({ error }, "Failed to load installed plugins");
			}
		}

		loadInstalledPlugins();

		return () => {
			mounted = false;
		};
	}, [loadPlugin, installedPlugins]); // loadPlugin is stable from useLoadPlugin hook

	// This component doesn't render anything
	return null;
}
