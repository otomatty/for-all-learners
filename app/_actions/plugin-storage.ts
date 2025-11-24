/**
 * Plugin Storage Server Actions (Placeholder for Tauri Migration)
 *
 * This file is a placeholder to allow dynamic imports in tests.
 * The actual implementation should be migrated to client-side Supabase access.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ lib/plugins/plugin-api.ts (via dynamic import)
 *
 * Dependencies (External files that this file imports):
 *   └─ None (placeholder)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 5.1)
 */

// Placeholder functions - will be removed in Phase 6
export async function setPluginStorage(
	_pluginId: string,
	_key: string,
	_value: unknown,
): Promise<void> {
	throw new Error(
		"Plugin storage not implemented - use client-side Supabase access",
	);
}

export async function deletePluginStorage(
	_pluginId: string,
	_key: string,
): Promise<void> {
	throw new Error(
		"Plugin storage not implemented - use client-side Supabase access",
	);
}

export async function getPluginStorageKeys(
	_pluginId: string,
): Promise<string[]> {
	throw new Error(
		"Plugin storage not implemented - use client-side Supabase access",
	);
}

export async function clearPluginStorage(_pluginId: string): Promise<void> {
	throw new Error(
		"Plugin storage not implemented - use client-side Supabase access",
	);
}
