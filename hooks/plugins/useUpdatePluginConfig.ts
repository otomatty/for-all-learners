/**
 * useUpdatePluginConfig Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ hooks/plugins/index.ts (exported for external use)
 *
 * Dependencies (External files that this imports):
 *   ├─ @tanstack/react-query
 *   ├─ @/lib/supabase/client
 *   └─ @/types/database.types
 *
 * Related Documentation:
 *   └─ PR #179: Plugin CRUD Migration
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

/**
 * Returns a mutation object for updating a plugin's configuration.
 *
 * The returned mutation's `mutate` function expects an object with the following properties:
 *   - `pluginId` (string): The ID of the plugin to update.
 *   - `config` (Record<string, unknown>): The new configuration for the plugin.
 *
 * Example usage:
 * ```ts
 * const updatePluginConfig = useUpdatePluginConfig();
 * updatePluginConfig.mutate({ pluginId: "my-plugin", config: { ... } });
 * ```
 */
export function useUpdatePluginConfig() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			pluginId,
			config,
		}: {
			pluginId: string;
			config: Record<string, unknown>;
		}): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				throw new Error("User not authenticated");
			}

			// Update config
			const { error } = await supabase
				.from("user_plugins")
				.update({
					config:
						config as Database["public"]["Tables"]["user_plugins"]["Row"]["config"],
				})
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId);

			if (error) {
				throw error;
			}
		},
		onSuccess: () => {
			// Invalidate installed plugins query
			queryClient.invalidateQueries({ queryKey: ["plugins", "installed"] });
		},
	});
}
