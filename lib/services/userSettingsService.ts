/**
 * User Settings Service
 * Server-side service functions for user settings operations
 * Extracted from hooks/user_settings/useUserSettings.ts to be reusable in server components
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

/**
 * Helper function to initialize user settings with default values
 * Extracted from hooks/user_settings/useUserSettings.ts
 */
async function initializeUserSettingsServer(
	supabase: Awaited<ReturnType<typeof createClient>>,
	userId: string,
): Promise<UserSettings> {
	const { data, error } = await supabase
		.from("user_settings")
		.insert({ user_id: userId })
		.select("*")
		.single();
	if (error || !data) {
		throw new Error(error?.message ?? "Failed to initialize user settings");
	}
	return data;
}

/**
 * Get user settings from server
 * If no settings exist, initializes with default values
 * Extracted from hooks/user_settings/useUserSettings.ts
 */
export async function getUserSettingsServer(
	userId: string,
): Promise<UserSettings> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("user_settings")
		.select("*")
		.eq("user_id", userId)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	if (!data) {
		// Initialize settings if they don't exist
		return await initializeUserSettingsServer(supabase, userId);
	}

	return data;
}

/**
 * Get user settings theme and mode only (lightweight version for layout)
 * Used in app/layout.tsx for theme initialization
 */
export async function getUserSettingsTheme(
	userId: string,
): Promise<{ theme: string; mode: "light" | "dark" | "system" }> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("user_settings")
		.select("theme, mode")
		.eq("user_id", userId)
		.maybeSingle();

	if (error) {
		// Return default values on error
		return { theme: "light", mode: "system" };
	}

	if (!data) {
		return { theme: "light", mode: "system" };
	}

	return {
		theme: data.theme || "light",
		mode: (data.mode as "light" | "dark" | "system") || "system",
	};
}

/**
 * Get user settings by user ID (for admin users page)
 * Similar to getUserSettingsServer but doesn't initialize if missing
 */
export async function getUserSettingsByUserServer(
	userId: string,
): Promise<UserSettings> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("user_settings")
		.select("*")
		.eq("user_id", userId)
		.single();

	if (error) {
		throw new Error(error.message);
	}

	if (!data) {
		throw new Error("User settings not found");
	}

	return data;
}
