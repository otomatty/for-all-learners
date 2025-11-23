"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Check if plugin is installed
 *
 * @param pluginId Plugin ID
 * @returns Query result with boolean indicating if plugin is installed
 */
export function useIsPluginInstalled(pluginId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["plugins", "installed", pluginId, "check"],
		queryFn: async (): Promise<boolean> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				return false;
			}

			// Check if installed
			const { data, error } = await supabase
				.from("user_plugins")
				.select("id")
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId)
				.single();

			if (error && error.code !== "PGRST116") {
				throw error;
			}

			return data !== null;
		},
		enabled: !!pluginId,
	});
}
