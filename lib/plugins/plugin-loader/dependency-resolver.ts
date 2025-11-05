/**
 * Dependency Resolver
 *
 * Resolves plugin dependencies and checks for missing dependencies.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ lib/plugins/plugin-loader/plugin-loader.ts
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-registry.ts
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

import type { PluginManifest } from "@/types/plugin";
import { getPluginRegistry } from "../plugin-registry";
import type { DependencyResolutionResult } from "../types";

/**
 * Resolve plugin dependencies
 *
 * @param manifest Plugin manifest
 * @returns Dependency resolution result
 */
export function resolveDependencies(
	manifest: PluginManifest,
): DependencyResolutionResult {
	const registry = getPluginRegistry();
	const missingDependencies: Array<{
		pluginId: string;
		requiredPlugin: string;
		requiredVersion: string;
	}> = [];

	if (manifest.dependencies) {
		for (const [depPluginId, versionRange] of Object.entries(
			manifest.dependencies,
		)) {
			const depPlugin = registry.get(depPluginId);

			if (!depPlugin) {
				missingDependencies.push({
					pluginId: manifest.id,
					requiredPlugin: depPluginId,
					requiredVersion: versionRange,
				});
			}
			// TODO: Implement semver version range checking
			// For Phase 1, we just check if the dependency is loaded
		}
	}

	return {
		loadOrder: [manifest.id],
		circularDependencies: [],
		missingDependencies,
	};
}
