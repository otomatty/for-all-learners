/**
 * Plugin Publisher
 *
 * Common logic for publishing plugins to the marketplace.
 * Used by both Server Actions and CLI commands.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ app/_actions/plugin-publish.ts
 *   └─ scripts/plugins/publish-plugin.ts
 *
 * Dependencies:
 *   ├─ types/plugin.ts
 *   ├─ types/database.types.ts
 *   └─ node:fs, node:path (filesystem operations)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/plugin-cli-publish.md
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import logger from "@/lib/logger";
import type { Database } from "@/types/database.types";
import type { PluginManifest } from "@/types/plugin";

export interface PublishResult {
	success: boolean;
	message?: string;
	pluginId?: string;
	codeUrl?: string;
}

/**
 * Publish a plugin to the marketplace
 *
 * Steps:
 * 1. Read plugin manifest and code
 * 2. Upload code to Supabase Storage
 * 3. Register plugin in plugins table
 *
 * @param pluginId Plugin ID
 * @param supabase Supabase client (with appropriate permissions)
 * @param pluginDir Plugin directory path
 * @returns Publish result
 */
export async function publishPluginToMarketplace(
	pluginId: string,
	supabase: SupabaseClient<Database>,
	pluginDir: string,
): Promise<PublishResult> {
	try {
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
