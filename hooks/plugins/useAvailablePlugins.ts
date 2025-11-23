/**
 * useAvailablePlugins Hook
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ hooks/plugins/index.ts (exported for external use)
 *
 * Dependencies (External files that this imports):
 *   ├─ @tanstack/react-query
 *   ├─ @/lib/supabase/client
 *   ├─ @/types/database.types
 *   └─ @/types/plugin
 *
 * Related Documentation:
 *   └─ PR #179: Plugin CRUD Migration
 */

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

export interface UseAvailablePluginsOptions {
	isOfficial?: boolean;
	isReviewed?: boolean;
	extensionPoint?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

/**
 * Get all available plugins from marketplace
 *
 * @param options Query options
 * @returns Query result with array of plugin metadata
 */
export function useAvailablePlugins(options?: UseAvailablePluginsOptions) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["plugins", "available", options],
		queryFn: async (): Promise<PluginMetadata[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) {
				throw new Error("User not authenticated");
			}

			let query = supabase
				.from("plugins")
				.select("*")
				.order("downloads_count", { ascending: false });

			// Apply filters
			if (options?.isOfficial !== undefined) {
				query = query.eq("is_official", options.isOfficial);
			}

			if (options?.isReviewed !== undefined) {
				query = query.eq("is_reviewed", options.isReviewed);
			}

			if (options?.extensionPoint) {
				// Validate extension point and map to database column name
				const allowedExtensionPoints = [
					"editor",
					"ai",
					"ui",
					"dataProcessor",
					"integration",
				] as const;

				if (
					!allowedExtensionPoints.includes(
						options.extensionPoint as (typeof allowedExtensionPoints)[number],
					)
				) {
					throw new Error(
						`Invalid extension point: ${options.extensionPoint}. Allowed values: ${allowedExtensionPoints.join(", ")}`,
					);
				}

				// Map extension point to database column name
				const extensionPointToColumn: Record<
					(typeof allowedExtensionPoints)[number],
					string
				> = {
					editor: "has_editor_extension",
					ai: "has_ai_extension",
					ui: "has_ui_extension",
					dataProcessor: "has_data_processor_extension",
					integration: "has_integration_extension",
				};

				const column =
					extensionPointToColumn[
						options.extensionPoint as (typeof allowedExtensionPoints)[number]
					];
				query = query.eq(column, true);
			}

			if (options?.search) {
				query = query.or(
					`name.ilike.%${options.search}%,description.ilike.%${options.search}%,author.ilike.%${options.search}%`,
				);
			}

			// Pagination
			if (options?.limit) {
				query = query.limit(options.limit);
			}

			if (options?.offset !== undefined) {
				query = query.range(
					options.offset,
					options.offset + (options.limit || 10) - 1,
				);
			}

			const { data, error } = await query;

			if (error) {
				throw error;
			}

			return (data || []).map(mapPluginRowToMetadata);
		},
	});
}
