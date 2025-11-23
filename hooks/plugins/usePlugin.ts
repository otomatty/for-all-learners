"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { PluginMetadata } from "@/types/plugin";

type PluginRow = Database["public"]["Tables"]["plugins"]["Row"];

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
 * Get plugin by ID
 *
 * @param pluginId Plugin ID
 * @returns Query result with plugin metadata or null
 */
export function usePlugin(pluginId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["plugins", pluginId],
		queryFn: async (): Promise<PluginMetadata | null> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				throw new Error("User not authenticated");
			}

			const { data, error } = await supabase
				.from("plugins")
				.select("*")
				.eq("plugin_id", pluginId)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					return null;
				}
				throw error;
			}

			return mapPluginRowToMetadata(data);
		},
		enabled: !!pluginId,
	});
}
