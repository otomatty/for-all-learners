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
 * Dependencies:
 *   ├─ lib/hooks/use-load-plugin.ts
 *   ├─ app/_actions/plugins.ts
 *   └─ lib/plugins/plugin-registry.ts
 *
 * Related Documentation:
 *   └─ Issue: docs/01_issues/open/2025_11/20251106_02_plugin-loading-issues.md
 */

"use client";

import { useEffect, useRef } from "react";
import { getInstalledPlugins } from "@/app/_actions/plugins";
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
	const hasLoadedRef = useRef(false);

	useEffect(() => {
		// Only run once on mount
		if (hasLoadedRef.current) {
			return;
		}
		hasLoadedRef.current = true;

		let mounted = true;

		async function loadInstalledPlugins() {
			try {
				// Get installed plugins
				const installedPlugins = await getInstalledPlugins();

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
	}, []); // Empty deps - only run once on mount

	// This component doesn't render anything
	return null;
}
