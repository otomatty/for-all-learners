#!/usr/bin/env bun

/**
 * Publish Plugin Command
 *
 * Publishes a local plugin to the marketplace:
 * 1. Builds the plugin
 * 2. Uploads to Supabase Storage
 * 3. Registers in plugins table
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugins/cli.ts
 *
 * Dependencies:
 *   ├─ scripts/plugins/build-plugin.ts
 *   ├─ lib/supabase/adminClient.ts
 *   ├─ lib/plugins/plugin-publisher.ts
 *   └─ node:fs, node:path (filesystem operations)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-cli-publish.md
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import logger from "@/lib/logger";
import { publishPluginToMarketplace } from "@/lib/plugins/plugin-publisher";
import { createAdminClient } from "@/lib/supabase/adminClient";
import type { PluginManifest } from "@/types/plugin";
import { buildPlugin } from "./build-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLUGINS_DIR = join(__dirname, "../../plugins/examples");

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
 * Publish plugin to marketplace
 */
export async function publishPlugin(pluginId: string): Promise<void> {
	logger.info({ pluginId }, "Publishing plugin");

	try {
		// Step 1: Validate plugin ID
		if (!pluginId || pluginId.trim() === "") {
			logger.error("Plugin ID is required");
			process.exit(1);
		}

		// Step 2: Find plugin directory
		const pluginDir = findPluginDir(pluginId);
		if (!pluginDir) {
			logger.error({ pluginId, searchDir: PLUGINS_DIR }, "Plugin not found");
			process.exit(1);
		}

		logger.info({ pluginDir }, "Found plugin directory");

		// Step 3: Build plugin
		logger.info("Building plugin...");
		await buildPlugin(pluginId);
		logger.info("Build completed");

		// Step 4: Create Supabase client with service role key
		logger.info("Connecting to Supabase...");
		const supabase = createAdminClient();

		// Step 5: Publish plugin
		logger.info("Publishing plugin to marketplace...");
		const result = await publishPluginToMarketplace(
			pluginId,
			supabase,
			pluginDir,
		);

		if (result.success) {
			logger.info(
				{
					pluginId: result.pluginId,
					codeUrl: result.codeUrl,
				},
				result.message || "Plugin published successfully",
			);
			console.log(`✅ ${result.message || "プラグインを公開しました"}`);
			if (result.codeUrl) {
				console.log(`   Code URL: ${result.codeUrl}`);
			}
		} else {
			logger.error(
				{ pluginId, error: result.message },
				"Failed to publish plugin",
			);
			console.error(`❌ ${result.message || "プラグインの公開に失敗しました"}`);
			process.exit(1);
		}
	} catch (error) {
		logger.error({ error, pluginId }, "Failed to publish plugin");
		if (error instanceof Error) {
			console.error(`❌ エラー: ${error.message}`);
		} else {
			console.error("❌ 不明なエラーが発生しました");
		}
		process.exit(1);
	}
}

// Only run if this file is executed directly (not imported)
if (import.meta.main) {
	const pluginId = process.argv[2];
	if (!pluginId) {
		console.error("Error: Plugin ID is required");
		console.log("Usage: bun run scripts/plugins/publish-plugin.ts <plugin-id>");
		process.exit(1);
	}
	publishPlugin(pluginId).catch((error) => {
		logger.error({ error }, "Fatal error");
		process.exit(1);
	});
}
