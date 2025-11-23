/**
 * useUpdatePlugin Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ hooks/plugins/index.ts (exported for external use)
 *   └─ app/(protected)/settings/plugins/_components/InstalledPluginCard.tsx
 *
 * Dependencies (External files that this imports):
 *   ├─ @tanstack/react-query
 *   ├─ @/lib/supabase/client
 *   └─ ./utils/version
 *
 * Related Documentation:
 *   └─ PR #179: Plugin CRUD Migration
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { isUpdateAvailable } from "./utils/version";

/**
 * Update a plugin to the latest version
 */
export function useUpdatePlugin() {
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

			// Get user plugin
			const { data: userPlugin, error: fetchError } = await supabase
				.from("user_plugins")
				.select("*")
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId)
				.single();

			if (fetchError) {
				throw new Error(`Plugin ${pluginId} is not installed`);
			}

			// Check if update is available
			if (!isUpdateAvailable(userPlugin.installed_version, plugin.version)) {
				throw new Error(`Plugin ${pluginId} is already at the latest version`);
			}

			// Update installed version
			const { error: updateError } = await supabase
				.from("user_plugins")
				.update({
					installed_version: plugin.version,
				})
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId);

			if (updateError) {
				throw updateError;
			}
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
