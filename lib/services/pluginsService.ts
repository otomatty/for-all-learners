/**
 * Plugins Service
 *
 * Server-side functions for plugin management
 * These functions can be used in server components and API routes
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this service):
 *   ├─ app/(protected)/settings/plugins/page.tsx
 *   └─ (Future: Other server components that need plugins)
 *
 * Dependencies (External files that this service uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { createClient } from "@/lib/supabase/server";
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

export interface GetAvailablePluginsOptions {
	isOfficial?: boolean;
	isReviewed?: boolean;
	extensionPoint?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

/**
 * Get available plugins (server-side)
 */
export async function getAvailablePluginsServer(
	options: GetAvailablePluginsOptions = {},
): Promise<PluginMetadata[]> {
	const supabase = await createClient();
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
	if (options.isOfficial !== undefined) {
		query = query.eq("is_official", options.isOfficial);
	}

	if (options.isReviewed !== undefined) {
		query = query.eq("is_reviewed", options.isReviewed);
	}

	if (options.extensionPoint) {
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

	if (options.search) {
		query = query.or(
			`name.ilike.%${options.search}%,description.ilike.%${options.search}%,author.ilike.%${options.search}%`,
		);
	}

	// Pagination
	if (options.limit) {
		query = query.limit(options.limit);
	}

	if (options.offset !== undefined) {
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
}

/**
 * Get installed plugins with updates (server-side)
 */
export async function getInstalledPluginsWithUpdatesServer(): Promise<
	Array<
		UserPlugin & {
			metadata: PluginMetadata;
			hasUpdate: boolean;
			latestVersion: string;
			installedVersion: string;
		}
	>
> {
	const supabase = await createClient();
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

	return (data || []).map((item) => {
		const userPlugin = mapUserPluginRowToUserPlugin(item);
		const metadata = mapPluginRowToMetadata(item.metadata as PluginRow);
		const latestVersion = metadata.version;
		const installedVersion = userPlugin.installedVersion;
		const hasUpdate = isUpdateAvailable(installedVersion, latestVersion);

		return {
			...userPlugin,
			metadata,
			hasUpdate,
			latestVersion,
			installedVersion,
		};
	});
}
