/**
 * Plugin Publish Server Actions
 *
 * Provides functionality for publishing local plugins to the marketplace:
 * - Package plugin code
 * - Upload to Supabase Storage
 * - Register in plugins table
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (none - CLI only)
 *
 * Dependencies:
 *   ├─ lib/supabase/server.ts
 *   ├─ lib/plugins/plugin-publisher.ts
 *   └─ node:fs, node:path (filesystem operations)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-cli-publish.md
 */

"use server";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { publishPluginToMarketplace } from "@/lib/plugins/plugin-publisher";
import { createClient } from "@/lib/supabase/server";
import type { PluginManifest } from "@/types/plugin";

const __filename = fileURLToPath(import.meta.url);
// Get project root (app/_actions -> app -> root)
const projectRoot = join(dirname(__filename), "../..");
const PLUGINS_DIR = join(projectRoot, "plugins/examples");

/**
 * Find plugin directory by plugin ID
 *
 * This function searches for a plugin directory by:
 * 1. Trying kebab-case version of plugin ID (e.g., "com.example.plugin" -> "com-example-plugin")
 * 2. Trying direct match
 * 3. Scanning all directories and matching manifest.id
 */
function findPluginDir(pluginId: string): string | null {
	// Try kebab-case version first (most common case)
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

	// Search all directories for matching manifest.id
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

/**
 * Publish a local plugin to the marketplace
 *
 * Steps:
 * 1. Authenticate user
 * 2. Find plugin directory
 * 3. Call common publish function
 *
 * @param pluginId Plugin ID
 * @returns Publish result
 */
export async function publishPlugin(pluginId: string): Promise<{
	success: boolean;
	message?: string;
	pluginId?: string;
	codeUrl?: string;
}> {
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return {
				success: false,
				message: "ユーザーが認証されていません",
			};
		}

		// Find plugin directory
		const pluginDir = findPluginDir(pluginId);
		if (!pluginDir) {
			return {
				success: false,
				message: `プラグインが見つかりません: ${pluginId}`,
			};
		}

		// Call common publish function
		return await publishPluginToMarketplace(pluginId, supabase, pluginDir);
	} catch (error) {
		const message = error instanceof Error ? error.message : "不明なエラー";
		return {
			success: false,
			message: `プラグインの公開に失敗しました: ${message}`,
		};
	}
}
