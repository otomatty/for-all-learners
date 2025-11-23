"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Disable a plugin
 */
export function useDisablePlugin() {
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
				.update({ enabled: false })
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
