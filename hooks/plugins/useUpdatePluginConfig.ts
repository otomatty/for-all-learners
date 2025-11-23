"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

/**
 * Update plugin configuration
 *
 * @param pluginId Plugin ID
 * @param config New configuration
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
