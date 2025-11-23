"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { PluginMetadata, UserPlugin } from "@/types/plugin";

type PluginRow = Database["public"]["Tables"]["plugins"]["Row"];
type UserPluginRow = Database["public"]["Tables"]["user_plugins"]["Row"];

/**
 * Map database row to PluginMetadata type
 */
function mapPluginRowToMetadata(row: PluginRow): PluginMetadata {
	return {
		id: row.id,
		pluginId: row.plugin_id,
		name: row.name,
		version: row.version,
		description: row.description ?? "",
		author: row.author,
		homepage: row.homepage ?? undefined,
		repository: row.repository ?? undefined,
		manifest: row.manifest as unknown as PluginMetadata["manifest"],
		codeUrl: row.code_url,
		isOfficial: row.is_official ?? false,
		isReviewed: row.is_reviewed ?? false,
		downloadsCount: row.downloads_count ?? 0,
		ratingAverage: row.rating_average ?? undefined,
		ratingCount: row.rating_count ?? undefined,
		createdAt: row.created_at ? new Date(row.created_at) : new Date(),
		updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
	};
}

/**
 * Map database row to UserPlugin type
 */
function mapUserPluginRowToUserPlugin(row: UserPluginRow): UserPlugin {
	return {
		id: row.id,
		userId: row.user_id,
		pluginId: row.plugin_id,
		installedVersion: row.installed_version,
		enabled: row.enabled ?? false,
		config: (row.config as Record<string, unknown>) ?? undefined,
		installedAt: row.installed_at ? new Date(row.installed_at) : new Date(),
	};
}

/**
 * Get user's installed plugins
 *
 * @returns Query result with array of user plugins with metadata
 */
export function useInstalledPlugins() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["plugins", "installed"],
		queryFn: async (): Promise<
			Array<UserPlugin & { metadata: PluginMetadata }>
		> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				throw new Error("User not authenticated");
			}

			// Query user plugins with metadata
			const { data, error } = await supabase
				.from("user_plugins")
				.select(
					`
        *,
        metadata:plugins!inner(*)
      `,
				)
				.eq("user_id", user.id)
				.order("installed_at", { ascending: false });

			if (error) {
				throw error;
			}

			return (data || []).map((item) => ({
				...mapUserPluginRowToUserPlugin(item),
				metadata: mapPluginRowToMetadata(item.metadata as PluginRow),
			}));
		},
	});
}
