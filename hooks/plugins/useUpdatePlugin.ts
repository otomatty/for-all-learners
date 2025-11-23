"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Compare two semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
 */
function compareVersions(v1: string, v2: string): number {
	const parts1 = v1.split(".").map(Number);
	const parts2 = v2.split(".").map(Number);

	// Ensure both arrays have same length
	const maxLength = Math.max(parts1.length, parts2.length);
	while (parts1.length < maxLength) parts1.push(0);
	while (parts2.length < maxLength) parts2.push(0);

	for (let i = 0; i < maxLength; i++) {
		if (parts1[i] > parts2[i]) return 1;
		if (parts1[i] < parts2[i]) return -1;
	}

	return 0;
}

/**
 * Check if an update is available for a plugin
 */
function isUpdateAvailable(
	installedVersion: string,
	latestVersion: string,
): boolean {
	return compareVersions(latestVersion, installedVersion) > 0;
}

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
