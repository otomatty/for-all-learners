/**
 * Hook for loading plugins from Storage
 *
 * This hook provides functionality to load plugins from Supabase Storage
 * into the browser. It handles fetching plugin code and loading it via PluginLoader.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/MarketplacePluginCard.tsx
 *
 * Dependencies:
 *   ├─ lib/plugins/plugin-loader/plugin-loader.ts
 *   ├─ lib/supabase/client.ts
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

"use client";

import { useCallback, useState } from "react";
import logger from "@/lib/logger";
import { PluginLoader } from "@/lib/plugins/plugin-loader/plugin-loader";
import { createClient } from "@/lib/supabase/client";
import type { PluginMetadata } from "@/types/plugin";

/**
 * Hook result
 */
interface UseLoadPluginResult {
	/** Whether plugin is currently being loaded */
	loading: boolean;
	/** Error message if loading failed */
	error: string | null;
	/** Load a plugin from Storage */
	loadPlugin: (plugin: PluginMetadata) => Promise<{
		success: boolean;
		error?: string;
	}>;
}

/**
 * Hook for loading plugins from Storage
 */
export function useLoadPlugin(): UseLoadPluginResult {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadPlugin = useCallback(
		async (
			plugin: PluginMetadata,
		): Promise<{
			success: boolean;
			error?: string;
		}> => {
			setLoading(true);
			setError(null);

			try {
				const supabase = createClient();

				// Fetch plugin code from Storage
				let code: string;
				try {
					// Extract storage path from code_url
					// Format: https://<project>.supabase.co/storage/v1/object/public/plugins/<path>
					const urlParts = plugin.codeUrl.split("/plugins/");
					const storagePath =
						urlParts.length > 1 ? urlParts[1] : plugin.codeUrl;

					// Try to get signed URL first (for private buckets)
					const { data: signedData, error: signedError } =
						await supabase.storage
							.from("plugins")
							.createSignedUrl(storagePath, 60);

					if (signedError || !signedData?.signedUrl) {
						// Fallback: try direct fetch (for public buckets)
						const response = await fetch(plugin.codeUrl);
						if (!response.ok) {
							throw new Error(
								`Failed to fetch plugin code: ${response.statusText}`,
							);
						}
						code = await response.text();
					} else {
						const response = await fetch(signedData.signedUrl);
						if (!response.ok) {
							throw new Error(
								`Failed to fetch plugin code: ${response.statusText}`,
							);
						}
						code = await response.text();
					}
				} catch (err) {
					const errorMessage =
						err instanceof Error ? err.message : "Failed to fetch plugin code";
					setError(errorMessage);
					setLoading(false);
					return {
						success: false,
						error: errorMessage,
					};
				}

				// Get plugin configuration from storage
				// Merge default config with saved config (saved config takes priority)
				let config: Record<string, unknown> = {};
				try {
					const {
						data: { user },
						error: userError,
					} = await supabase.auth.getUser();

					if (userError || !user) {
						throw new Error("ユーザーが認証されていません");
					}

					const { data, error } = await supabase
						.from("plugin_storage")
						.select("key, value")
						.eq("user_id", user.id)
						.eq("plugin_id", plugin.pluginId);

					if (error) {
						throw error;
					}

					// Convert to object
					const savedConfig: Record<string, unknown> = {};
					for (const row of data || []) {
						savedConfig[row.key] = row.value;
					}

					const defaultConfig =
						(plugin.manifest.defaultConfig as Record<string, unknown>) || {};
					// Merge: default config first, then saved config (saved overrides default)
					config = {
						...defaultConfig,
						...savedConfig,
					};
				} catch (err) {
					// If config retrieval fails, use default config only
					config =
						(plugin.manifest.defaultConfig as Record<string, unknown>) || {};
					logger.warn(
						{ error: err, pluginId: plugin.pluginId },
						"Failed to get plugin config, using default config",
					);
				}

				// Load plugin using PluginLoader
				const loader = PluginLoader.getInstance();
				const loadResult = await loader.loadPlugin(plugin.manifest, code, {
					enableImmediately: true,
					requireSignature: false, // For now, skip signature verification
					config, // ✅ Pass config to plugin
				});

				if (!loadResult.success || !loadResult.plugin) {
					const errorMessage = loadResult.error || "Failed to load plugin";
					setError(errorMessage);
					setLoading(false);
					return {
						success: false,
						error: errorMessage,
					};
				}

				setLoading(false);
				return {
					success: true,
				};
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Unknown error";
				setError(errorMessage);
				setLoading(false);
				return {
					success: false,
					error: errorMessage,
				};
			}
		},
		[],
	);

	return {
		loading,
		error,
		loadPlugin,
	};
}
