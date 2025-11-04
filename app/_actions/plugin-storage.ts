/**
 * Plugin Storage Server Actions
 *
 * Provides plugin-specific key-value storage functionality.
 * Each plugin has isolated storage per user.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/plugin-api.ts
 *   └─ app/(protected)/settings/plugins/page.tsx
 *
 * Dependencies:
 *   ├─ lib/supabase/server.ts
 *   └─ types/database.types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

"use server";

import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Json = Database["public"]["Tables"]["plugin_storage"]["Row"]["value"];

// ============================================================================
// Get Plugin Storage
// ============================================================================

/**
 * Get value from plugin storage
 *
 * @param pluginId Plugin ID
 * @param key Storage key
 * @returns Value or undefined if not found
 */
export async function getPluginStorage(
	pluginId: string,
	key: string,
): Promise<unknown | undefined> {
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

		// Query storage
		const { data, error } = await supabase
			.from("plugin_storage")
			.select("value")
			.eq("user_id", user.id)
			.eq("plugin_id", pluginId)
			.eq("key", key)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				// No rows found
				return undefined;
			}
			throw error;
		}

		return data?.value;
	} catch (error) {
		logger.error(
			{ error, pluginId, key, userId: user?.id },
			"[plugin-storage] Failed to get plugin storage",
		);
		throw error;
	}
}

// ============================================================================
// Set Plugin Storage
// ============================================================================

/**
 * Set value in plugin storage
 *
 * @param pluginId Plugin ID
 * @param key Storage key
 * @param value Value to store (must be JSON-serializable)
 */
export async function setPluginStorage(
	pluginId: string,
	key: string,
	value: unknown,
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

		// Upsert storage value
		const { error } = await supabase.from("plugin_storage").upsert(
			{
				user_id: user.id,
				plugin_id: pluginId,
				key,
				value: value as unknown as Json,
			},
			{
				onConflict: "user_id,plugin_id,key",
			},
		);

		if (error) {
			throw error;
		}
	} catch (error) {
		logger.error(
			{ error, pluginId, key, userId: user?.id },
			"[plugin-storage] Failed to set plugin storage",
		);
		throw error;
	}
}

// ============================================================================
// Delete Plugin Storage
// ============================================================================

/**
 * Delete value from plugin storage
 *
 * @param pluginId Plugin ID
 * @param key Storage key
 */
export async function deletePluginStorage(
	pluginId: string,
	key: string,
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

		// Delete storage value
		const { error } = await supabase
			.from("plugin_storage")
			.delete()
			.eq("user_id", user.id)
			.eq("plugin_id", pluginId)
			.eq("key", key);

		if (error) {
			throw error;
		}
	} catch (error) {
		logger.error(
			{ error, pluginId, key, userId: user?.id },
			"[plugin-storage] Failed to delete plugin storage",
		);
		throw error;
	}
}

// ============================================================================
// Get Plugin Storage Keys
// ============================================================================

/**
 * Get all keys in plugin storage
 *
 * @param pluginId Plugin ID
 * @returns Array of keys
 */
export async function getPluginStorageKeys(
	pluginId: string,
): Promise<string[]> {
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

		// Query all keys
		const { data, error } = await supabase
			.from("plugin_storage")
			.select("key")
			.eq("user_id", user.id)
			.eq("plugin_id", pluginId);

		if (error) {
			throw error;
		}

		return data?.map((row) => row.key) || [];
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugin-storage] Failed to get plugin storage keys",
		);
		throw error;
	}
}

// ============================================================================
// Clear Plugin Storage
// ============================================================================

/**
 * Clear all data from plugin storage
 *
 * @param pluginId Plugin ID
 */
export async function clearPluginStorage(pluginId: string): Promise<void> {
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

		// Delete all storage for this plugin
		const { error } = await supabase
			.from("plugin_storage")
			.delete()
			.eq("user_id", user.id)
			.eq("plugin_id", pluginId);

		if (error) {
			throw error;
		}
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugin-storage] Failed to clear plugin storage",
		);
		throw error;
	}
}

// ============================================================================
// Get All Plugin Storage
// ============================================================================

/**
 * Get all key-value pairs from plugin storage
 *
 * @param pluginId Plugin ID
 * @returns Map of key to value
 */
export async function getAllPluginStorage(
	pluginId: string,
): Promise<Record<string, unknown>> {
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

		// Query all storage
		const { data, error } = await supabase
			.from("plugin_storage")
			.select("key, value")
			.eq("user_id", user.id)
			.eq("plugin_id", pluginId);

		if (error) {
			throw error;
		}

		// Convert to object
		const result: Record<string, unknown> = {};
		for (const row of data || []) {
			result[row.key] = row.value;
		}

		return result;
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugin-storage] Failed to get all plugin storage",
		);
		throw error;
	}
}
