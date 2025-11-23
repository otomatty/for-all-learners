/**
 * useEnablePlugin Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ hooks/plugins/index.ts (exported for external use)
 *   └─ app/(protected)/settings/plugins/_components/InstalledPluginCard.tsx
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
 * Enable a plugin
 */
export function useEnablePlugin() {
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

			// Update enabled status
			const { error } = await supabase
				.from("user_plugins")
				.update({
					enabled: true,
					last_used_at: new Date().toISOString(),
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
			queryClient.invalidateQueries({
				queryKey: ["plugins", "installed", "with-updates"],
			});
		},
	});
}
