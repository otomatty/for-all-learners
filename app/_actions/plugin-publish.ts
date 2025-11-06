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
 *   └─ app/(protected)/settings/plugins/dev/page.tsx (future)
 *
 * Dependencies:
 *   ├─ lib/supabase/server.ts
 *   ├─ types/plugin.ts
 *   └─ node:fs, node:path (filesystem operations)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

"use server";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
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
 * 1. Read plugin manifest and code
 * 2. Upload code to Supabase Storage
 * 3. Register plugin in plugins table
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

		// Read manifest
		const manifestPath = join(pluginDir, "plugin.json");
		if (!existsSync(manifestPath)) {
			return {
				success: false,
				message: `マニフェストファイルが見つかりません: ${manifestPath}`,
			};
		}

		const manifestContent = readFileSync(manifestPath, "utf-8");
		const manifest = JSON.parse(manifestContent) as PluginManifest;

		// Verify plugin ID matches
		if (manifest.id !== pluginId) {
			return {
				success: false,
				message: `プラグインIDが一致しません: ${manifest.id} !== ${pluginId}`,
			};
		}

		// Read plugin code (use dist/index.js if available, otherwise source)
		let code: string;
		const distPath = join(pluginDir, "dist/index.js");
		if (existsSync(distPath)) {
			code = readFileSync(distPath, "utf-8");
		} else {
			// Try source file
			const sourcePath = join(pluginDir, manifest.main);
			if (!existsSync(sourcePath)) {
				return {
					success: false,
					message: `プラグインコードが見つかりません: ${sourcePath} または ${distPath}`,
				};
			}
			code = readFileSync(sourcePath, "utf-8");
		}

		// Upload code to Supabase Storage
		// Storage path: plugins/{pluginId}/{version}/index.js
		const storagePath = `plugins/${pluginId}/${manifest.version}/index.js`;

		// Create file from code string
		const codeBlob = new Blob([code], { type: "text/javascript" });
		const codeFile = new File([codeBlob], "index.js", {
			type: "text/javascript",
		});

		// Upload to Storage
		const { data: uploadData, error: uploadError } = await supabase.storage
			.from("plugins")
			.upload(storagePath, codeFile, {
				upsert: true, // Overwrite if exists
				contentType: "text/javascript",
			});

		if (uploadError) {
			logger.error(
				{ error: uploadError, pluginId, storagePath },
				"Failed to upload plugin code to Storage",
			);
			return {
				success: false,
				message: `Storageへのアップロードに失敗しました: ${uploadError.message}`,
			};
		}

		// Get public URL
		const {
			data: { publicUrl },
		} = supabase.storage.from("plugins").getPublicUrl(storagePath);

		if (!publicUrl) {
			return {
				success: false,
				message: "公開URLの取得に失敗しました",
			};
		}

		// Prepare plugin data for database
		const extensionPoints = manifest.extensionPoints || {};
		const pluginData: Database["public"]["Tables"]["plugins"]["Insert"] = {
			plugin_id: manifest.id,
			name: manifest.name,
			version: manifest.version,
			description: manifest.description || "",
			author: manifest.author,
			homepage: manifest.homepage,
			repository: manifest.repository,
			license: manifest.license,
			manifest:
				manifest as unknown as Database["public"]["Tables"]["plugins"]["Row"]["manifest"],
			code_url: publicUrl,
			is_official: false, // Local plugins are not official by default
			is_reviewed: false, // Local plugins need review
			has_editor_extension: extensionPoints.editor || false,
			has_ai_extension: extensionPoints.ai || false,
			has_ui_extension: extensionPoints.ui || false,
			has_data_processor_extension: extensionPoints.dataProcessor || false,
			has_integration_extension: extensionPoints.integration || false,
		};

		// Check if plugin already exists
		const { data: existingPlugin } = await supabase
			.from("plugins")
			.select("id, version")
			.eq("plugin_id", pluginId)
			.single();

		if (existingPlugin) {
			// Update existing plugin
			const { error: updateError } = await supabase
				.from("plugins")
				.update({
					...pluginData,
					updated_at: new Date().toISOString(),
				})
				.eq("plugin_id", pluginId);

			if (updateError) {
				logger.error(
					{ error: updateError, pluginId },
					"Failed to update plugin in database",
				);
				return {
					success: false,
					message: `データベースの更新に失敗しました: ${updateError.message}`,
				};
			}

			logger.info(
				{ pluginId, version: manifest.version },
				"Plugin updated in marketplace",
			);

			return {
				success: true,
				message: "プラグインを更新しました",
				pluginId,
				codeUrl: publicUrl,
			};
		} else {
			// Insert new plugin
			const { error: insertError } = await supabase
				.from("plugins")
				.insert(pluginData);

			if (insertError) {
				logger.error(
					{ error: insertError, pluginId },
					"Failed to insert plugin into database",
				);
				return {
					success: false,
					message: `データベースへの登録に失敗しました: ${insertError.message}`,
				};
			}

			logger.info(
				{ pluginId, version: manifest.version },
				"Plugin published to marketplace",
			);

			return {
				success: true,
				message: "プラグインを公開しました",
				pluginId,
				codeUrl: publicUrl,
			};
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : "不明なエラー";
		logger.error({ error, pluginId }, "Failed to publish plugin");
		return {
			success: false,
			message: `プラグインの公開に失敗しました: ${message}`,
		};
	}
}
