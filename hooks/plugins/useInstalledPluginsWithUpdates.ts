/**
 * useInstalledPluginsWithUpdates Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ hooks/plugins/index.ts (exported for external use)
 *
 * Dependencies (External files that this imports):
 *   ├─ @/types/plugin
 *   ├─ ./useInstalledPlugins
 *   └─ ./utils/version
 *
 * Related Documentation:
 *   └─ PR #179: Plugin CRUD Migration
 */

"use client";

import { useInstalledPlugins } from "./useInstalledPlugins";
import { isUpdateAvailable } from "./utils/version";

/**
 * Get plugins with update availability information
 *
 * @returns Query result with array of installed plugins with update info
 */
export function useInstalledPluginsWithUpdates() {
	const { data: installedPlugins, ...rest } = useInstalledPlugins();

	return {
		...rest,
		data: installedPlugins?.map((userPlugin) => {
			const latestVersion = userPlugin.metadata.version;
			const installedVersion = userPlugin.installedVersion;
			const hasUpdate = isUpdateAvailable(installedVersion, latestVersion);

			return {
				...userPlugin,
				hasUpdate,
				latestVersion,
				installedVersion,
			};
		}),
	};
}
