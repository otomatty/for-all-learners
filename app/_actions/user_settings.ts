"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * Fetches user settings for the authenticated user.
 * If no settings exist, initializes with default values.
 */
export async function getUserSettings(): Promise<
	Database["public"]["Tables"]["user_settings"]["Row"]
> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const { data, error } = await supabase
		.from("user_settings")
		.select("*")
		.eq("user_id", user.id)
		.single();

	if (error?.message.includes("No rows")) {
		// Delegate to initializer
		return await initializeUserSettings();
	}

	if (error) {
		console.error("getUserSettings fetch error:", error);
		throw new Error(error.message);
	}

	if (!data) {
		throw new Error("User settings not found");
	}

	return data;
}

/**
 * Updates user settings for the authenticated user.
 *
 * @param updates Partial settings to update.
 */
export async function updateUserSettings(
	updates: Partial<Database["public"]["Tables"]["user_settings"]["Update"]>,
): Promise<Database["public"]["Tables"]["user_settings"]["Row"]> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const { data, error } = await supabase
		.from("user_settings")
		.upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
		.select("*")
		.single();

	if (error || !data) {
		console.error("updateUserSettings error:", error);
		throw new Error(error?.message ?? "Failed to update user settings");
	}

	return data;
}

/**
 * Initializes user settings with default values for the authenticated user.
 */
export async function initializeUserSettings(): Promise<
	Database["public"]["Tables"]["user_settings"]["Row"]
> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const { data, error } = await supabase
		.from("user_settings")
		.insert({ user_id: user.id })
		.select("*")
		.single();
	if (error || !data) {
		console.error("initializeUserSettings error:", error);
		throw new Error(error?.message ?? "Failed to initialize user settings");
	}
	return data;
}
