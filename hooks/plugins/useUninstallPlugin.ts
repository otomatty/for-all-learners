"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Uninstall a plugin for the current user
 */
export function useUninstallPlugin() {
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

			// Delete user plugin
			const { error: deleteError } = await supabase
				.from("user_plugins")
				.delete()
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId);

			if (deleteError) {
				throw deleteError;
			}

			// Clear plugin storage
			const { error: storageError } = await supabase
				.from("plugin_storage")
				.delete()
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId);

			if (storageError) {
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
