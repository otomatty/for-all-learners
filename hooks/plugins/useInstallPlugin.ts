/**
 * useInstallPlugin Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ hooks/plugins/index.ts (exported for external use)
 *   └─ app/(protected)/settings/plugins/_components/MarketplacePluginCard.tsx
 *
 * Dependencies (External files that this imports):
 *   ├─ @tanstack/react-query
 *   └─ @/lib/supabase/client
 *
 * Related Documentation:
 *   └─ PR #179: Plugin CRUD Migration
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Install a plugin for the current user
 *
 * This function:
 * 1. Gets plugin metadata from database
 * 2. Registers in user_plugins table
 *
 * Note: Plugin loading is done on the client side after installation.
 * This is because PluginLoader uses Web Workers which only work in browser environment.
 */
export function useInstallPlugin() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (pluginId: string): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				throw new Error("User not authenticated");
			}

			// Get plugin metadata
			const { data: plugin, error: pluginError } = await supabase
				.from("plugins")
				.select("*")
				.eq("plugin_id", pluginId)
				.single();

			if (pluginError || !plugin) {
				throw new Error(`Plugin ${pluginId} not found`);
			}

			// Check if already installed
			const { data: existing } = await supabase
				.from("user_plugins")
				.select("*")
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId)
				.single();

			if (existing) {
				throw new Error(`Plugin ${pluginId} is already installed`);
			}

			// Insert user plugin
			const { error: insertError } = await supabase
				.from("user_plugins")
				.insert({
					user_id: user.id,
					plugin_id: pluginId,
					installed_version: plugin.version,
					enabled: true,
				})
				.select()
				.single();

			if (insertError) {
				throw insertError;
			}

			// Increment download count
			await supabase.rpc("increment_plugin_downloads", {
				p_plugin_id: pluginId,
			});
		},
		onSuccess: () => {
			// Invalidate installed plugins query
			queryClient.invalidateQueries({ queryKey: ["plugins", "installed"] });
			queryClient.invalidateQueries({
				queryKey: ["plugins", "installed", "with-updates"],
			});
		},
	});
}
