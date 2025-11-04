/**
 * Plugin Management Server Actions
 *
 * Provides CRUD operations for plugin installation and management.
 * Handles plugin marketplace queries and user plugin installations.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/page.tsx
 *
 * Dependencies:
 *   ├─ lib/supabase/server.ts
 *   ├─ types/plugin.ts
 *   └─ types/database.types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

"use server";

import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type {
	PluginManifest,
	PluginMetadata,
	UserPlugin,
} from "@/types/plugin";

// ============================================================================
// Type Mapping Helpers
// ============================================================================

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
		manifest: row.manifest as unknown as PluginManifest,
		codeUrl: row.code_url,
		isOfficial: row.is_official ?? false,
		isReviewed: row.is_reviewed ?? false,
		downloadsCount: row.downloads_count ?? 0,
		ratingAverage: row.rating_average ?? undefined,
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

// ============================================================================
// Plugin Marketplace Queries
// ============================================================================

/**
 * Get all available plugins from marketplace
 *
 * @param options Query options
 * @returns Array of plugin metadata
 */
export async function getAvailablePlugins(options?: {
	isOfficial?: boolean;
	isReviewed?: boolean;
	extensionPoint?: string;
	search?: string;
	limit?: number;
	offset?: number;
}): Promise<PluginMetadata[]> {
	try {
		const supabase = await createClient();

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

		if (options?.offset) {
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
	} catch (error) {
		logger.error(
			{ error, options },
			"[plugins] Failed to get available plugins",
		);
		throw error;
	}
}

/**
 * Get plugin by ID
 *
 * @param pluginId Plugin ID
 * @returns Plugin metadata or null
 */
export async function getPlugin(
	pluginId: string,
): Promise<PluginMetadata | null> {
	try {
		const supabase = await createClient();

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
	} catch (error) {
		logger.error({ error, pluginId }, "[plugins] Failed to get plugin");
		throw error;
	}
}

// ============================================================================
// User Plugin Management
// ============================================================================

/**
 * Get user's installed plugins
 *
 * @returns Array of user plugins with metadata
 */
export async function getInstalledPlugins(): Promise<
	Array<UserPlugin & { metadata: PluginMetadata }>
> {
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
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
	} catch (error) {
		logger.error({ error }, "[plugins] Failed to get installed plugins");
		throw error;
	}
}

/**
 * Install a plugin for the current user
 *
 * @param formData FormData containing pluginId
 */
export async function installPlugin(formData: FormData): Promise<void> {
	const pluginId = formData.get("pluginId") as string;
	if (!pluginId) {
		throw new Error("Plugin ID is required");
	}

	let user: { id: string } | null = null;
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();

		if (!currentUser) {
			throw new Error("User not authenticated");
		}

		user = currentUser;

		// Get plugin metadata
		const plugin = await getPlugin(pluginId);

		if (!plugin) {
			throw new Error(`Plugin ${pluginId} not found`);
		}

		// Check if already installed
		const { data: existing } = await supabase
			.from("user_plugins")
			.select("*")
			.eq("user_id", user.id)
			.eq("plugin_id", pluginId)
			.single();

		if (existing) {
			throw new Error(`Plugin ${pluginId} is already installed`);
		}

		// Insert user plugin
		const { error } = await supabase
			.from("user_plugins")
			.insert({
				user_id: user.id,
				plugin_id: pluginId,
				installed_version: plugin.version,
				enabled: true,
			})
			.select()
			.single();

		if (error) {
			throw error;
		}

		// Increment download count
		await supabase.rpc("increment_plugin_downloads", {
			p_plugin_id: pluginId,
		});
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugins] Failed to install plugin",
		);
		throw error;
	}
}

/**
 * Uninstall a plugin for the current user
 *
 * @param formData FormData containing pluginId
 */
export async function uninstallPlugin(formData: FormData): Promise<void> {
	const pluginId = formData.get("pluginId") as string;
	if (!pluginId) {
		throw new Error("Plugin ID is required");
	}

	let user: { id: string } | null = null;
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();

		if (!currentUser) {
			throw new Error("User not authenticated");
		}

		user = currentUser;

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
			logger.warn(
				{ storageError, pluginId, userId: user?.id },
				"[plugins] Failed to clear plugin storage",
			);
			// Don't throw - uninstall should succeed even if storage cleanup fails
		}
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugins] Failed to uninstall plugin",
		);
		throw error;
	}
}

/**
 * Enable a plugin
 *
 * @param formData FormData containing pluginId
 */
export async function enablePlugin(formData: FormData): Promise<void> {
	const pluginId = formData.get("pluginId") as string;
	if (!pluginId) {
		throw new Error("Plugin ID is required");
	}

	let user: { id: string } | null = null;
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();

		if (!currentUser) {
			throw new Error("User not authenticated");
		}

		user = currentUser;

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
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugins] Failed to enable plugin",
		);
		throw error;
	}
}

/**
 * Disable a plugin
 *
 * @param formData FormData containing pluginId
 */
export async function disablePlugin(formData: FormData): Promise<void> {
	const pluginId = formData.get("pluginId") as string;
	if (!pluginId) {
		throw new Error("Plugin ID is required");
	}

	let user: { id: string } | null = null;
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();

		if (!currentUser) {
			throw new Error("User not authenticated");
		}

		user = currentUser;

		// Update enabled status
		const { error } = await supabase
			.from("user_plugins")
			.update({ enabled: false })
			.eq("user_id", user.id)
			.eq("plugin_id", pluginId);

		if (error) {
			throw error;
		}
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugins] Failed to disable plugin",
		);
		throw error;
	}
}

/**
 * Update plugin configuration
 *
 * @param pluginId Plugin ID
 * @param config New configuration
 */
export async function updatePluginConfig(
	pluginId: string,
	config: Record<string, unknown>,
): Promise<void> {
	let user: { id: string } | null = null;
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();

		if (!currentUser) {
			throw new Error("User not authenticated");
		}

		user = currentUser;

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
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugins] Failed to update plugin config",
		);
		throw error;
	}
}

/**
 * Check if plugin is installed
 *
 * @param pluginId Plugin ID
 * @returns True if installed
 */
export async function isPluginInstalled(pluginId: string): Promise<boolean> {
	let user: { id: string } | null = null;
	try {
		const supabase = await createClient();

		// Get current user
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();

		if (!currentUser) {
			return false;
		}

		user = currentUser;

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
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugins] Failed to check if plugin is installed",
		);
		return false;
	}
}
