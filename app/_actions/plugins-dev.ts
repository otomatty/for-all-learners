/**
 * Plugin Development Server Actions
 *
 * Provides functionality for local plugin development:
 * - Listing local plugins from plugins/examples directory
 * - Loading local plugins for development
 * - Reloading local plugins (hot reload)
 * - Managing development mode
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/dev/page.tsx
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-loader/plugin-loader.ts
 *   ├─ lib/plugins/plugin-registry.ts
 *   ├─ types/plugin.ts
 *   └─ node:fs, node:path (filesystem operations)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

"use server";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import logger from "@/lib/logger";
import { PluginLoader } from "@/lib/plugins/plugin-loader/plugin-loader";
import { getPluginRegistry } from "@/lib/plugins/plugin-registry";
import type { LoadedPlugin, PluginManifest } from "@/types/plugin";

const __filename = fileURLToPath(import.meta.url);
// Get project root (app/_actions -> app -> root)
const projectRoot = join(dirname(__filename), "../..");
const PLUGINS_DIR = join(projectRoot, "plugins/examples");

/**
 * Local plugin information
 */
export interface LocalPluginInfo {
	/** Plugin directory path */
	path: string;

	/** Plugin ID (from manifest) */
	id: string;

	/** Plugin name */
	name: string;

	/** Plugin version */
	version: string;

	/** Plugin description */
	description: string;

	/** Plugin author */
	author: string;

	/** Whether plugin is currently loaded */
	isLoaded: boolean;

	/** Whether plugin is enabled */
	isEnabled: boolean;
}

/**
 * Get list of local plugins from plugins/examples directory
 *
 * @returns Array of local plugin information
 */
export async function getLocalPlugins(): Promise<LocalPluginInfo[]> {
	try {
		if (!existsSync(PLUGINS_DIR)) {
			logger.warn({ pluginsDir: PLUGINS_DIR }, "Plugins directory not found");
			return [];
		}

		const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
		const plugins: LocalPluginInfo[] = [];
		const registry = getPluginRegistry();

		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const pluginDir = join(PLUGINS_DIR, entry.name);
			const manifestPath = join(pluginDir, "plugin.json");

			if (!existsSync(manifestPath)) {
				continue;
			}

			try {
				const manifestContent = readFileSync(manifestPath, "utf-8");
				const manifest = JSON.parse(manifestContent) as PluginManifest;

				// Check if plugin is loaded
				const loadedPlugin = registry.has(manifest.id)
					? registry.get(manifest.id)
					: null;

				plugins.push({
					path: pluginDir,
					id: manifest.id,
					name: manifest.name,
					version: manifest.version,
					description: manifest.description || "",
					author: manifest.author,
					isLoaded: loadedPlugin !== null,
					isEnabled: loadedPlugin?.enabled ?? false,
				});
			} catch (error) {
				logger.error(
					{ error, pluginDir: entry.name },
					"Failed to read plugin manifest",
				);
			}
		}

		return plugins;
	} catch (error) {
		logger.error(
			{ error, pluginsDir: PLUGINS_DIR },
			"Failed to get local plugins",
		);
		throw error;
	}
}

/**
 * Load a local plugin for development
 *
 * @param pluginId Plugin ID
 * @returns Load result
 */
export async function loadLocalPlugin(pluginId: string): Promise<{
	success: boolean;
	plugin?: LoadedPlugin;
	error?: string;
}> {
	try {
		// Find plugin directory
		const pluginDir = findPluginDir(pluginId);
		if (!pluginDir) {
			return {
				success: false,
				error: `Plugin not found: ${pluginId}`,
			};
		}

		// Read manifest
		const manifestPath = join(pluginDir, "plugin.json");
		if (!existsSync(manifestPath)) {
			return {
				success: false,
				error: `Manifest not found: ${manifestPath}`,
			};
		}

		const manifestContent = readFileSync(manifestPath, "utf-8");
		const manifest = JSON.parse(manifestContent) as PluginManifest;

		// Read plugin code
		const codePath = join(pluginDir, manifest.main);
		if (!existsSync(codePath)) {
			// Try dist/index.js if source file doesn't exist
			const distPath = join(pluginDir, "dist/index.js");
			if (existsSync(distPath)) {
				const code = readFileSync(distPath, "utf-8");
				return await loadPluginCode(manifest, code);
			}
			return {
				success: false,
				error: `Plugin code not found: ${codePath}`,
			};
		}

		// For development, we need to use the built code
		// Check if dist/index.js exists (built version)
		const distPath = join(pluginDir, "dist/index.js");
		if (existsSync(distPath)) {
			const code = readFileSync(distPath, "utf-8");
			return await loadPluginCode(manifest, code);
		}

		// If no built version, try to read source (will fail if not bundled)
		// This is a fallback for development
		const code = readFileSync(codePath, "utf-8");
		return await loadPluginCode(manifest, code);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger.error({ error, pluginId }, "Failed to load local plugin");
		return {
			success: false,
			error: message,
		};
	}
}

/**
 * Load plugin code using PluginLoader
 */
async function loadPluginCode(
	manifest: PluginManifest,
	code: string,
): Promise<{
	success: boolean;
	plugin?: LoadedPlugin;
	error?: string;
}> {
	const loader = PluginLoader.getInstance();

	// Check if already loaded - if so, unload first
	const registry = getPluginRegistry();
	if (registry.has(manifest.id)) {
		await loader.unloadPlugin(manifest.id);
	}

	const result = await loader.loadPlugin(manifest, code, {
		enableImmediately: true,
		requireSignature: false, // Skip signature verification for local development
	});

	return result;
}

/**
 * Reload a local plugin (unload and load again)
 *
 * @param pluginId Plugin ID
 * @returns Reload result
 */
export async function reloadLocalPlugin(pluginId: string): Promise<{
	success: boolean;
	plugin?: LoadedPlugin;
	error?: string;
}> {
	try {
		// First unload if loaded
		const loader = PluginLoader.getInstance();
		const registry = getPluginRegistry();

		if (registry.has(pluginId)) {
			await loader.unloadPlugin(pluginId);
		}

		// Then load again
		return await loadLocalPlugin(pluginId);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger.error({ error, pluginId }, "Failed to reload local plugin");
		return {
			success: false,
			error: message,
		};
	}
}

/**
 * Unload a local plugin
 *
 * @param pluginId Plugin ID
 * @returns Success status
 */
export async function unloadLocalPlugin(pluginId: string): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		const loader = PluginLoader.getInstance();
		await loader.unloadPlugin(pluginId);
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger.error({ error, pluginId }, "Failed to unload local plugin");
		return {
			success: false,
			error: message,
		};
	}
}

/**
 * Find plugin directory by plugin ID
 */
function findPluginDir(pluginId: string): string | null {
	// Try exact match first (kebab-case)
	const kebabId = pluginId.replace(/\./g, "-");
	const kebabPath = join(PLUGINS_DIR, kebabId);
	if (existsSync(kebabPath)) {
		return kebabPath;
	}

	// Try direct match
	const directPath = join(PLUGINS_DIR, pluginId);
	if (existsSync(directPath)) {
		return directPath;
	}

	// Search all directories
	if (!existsSync(PLUGINS_DIR)) {
		return null;
	}

	const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}

		const pluginDir = join(PLUGINS_DIR, entry.name);
		const manifestPath = join(pluginDir, "plugin.json");

		if (!existsSync(manifestPath)) {
			continue;
		}

		try {
			const manifestContent = readFileSync(manifestPath, "utf-8");
			const manifest = JSON.parse(manifestContent) as PluginManifest;

			if (manifest.id === pluginId) {
				return pluginDir;
			}
		} catch {
			// Skip invalid manifests
		}
	}

	return null;
}
