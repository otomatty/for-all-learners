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
		// Return default settings for unauthenticated users
		return {
			theme: "light",
			mode: "system",
		} as Database["public"]["Tables"]["user_settings"]["Row"];
	}

	const { data, error } = await supabase
		.from("user_settings")
		.select("*")
		.eq("user_id", user.id)
		.maybeSingle();

	if (error) {
		throw new Error(error.message);
	}

	if (!data) {
		// 初期設定がなければ初期化
		return await initializeUserSettings();
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
		throw new Error(error?.message ?? "Failed to initialize user settings");
	}
	return data;
}

/**
 * Fetches user settings for the specified user ID.
 * @param userId - UUID of the user whose settings to fetch
 */
export async function getUserSettingsByUser(
	userId: string,
): Promise<Database["public"]["Tables"]["user_settings"]["Row"]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("user_settings")
		.select("*")
		.eq("user_id", userId)
		.single();
	if (error) throw error;
	return data;
}

/**
 * Fetches the user's help video audio playback preference.
 * @returns true if help video audio should be played, false otherwise.
 */
export async function getHelpVideoAudioSetting(): Promise<boolean> {
	const settings = await getUserSettings();
	// 新規カラム play_help_video_audio が存在しない場合はデフォルト false
	return settings.play_help_video_audio ?? false;
}

/**
 * Toggles the user's help video audio playback preference and returns the updated value.
 * @param current 現在の音声再生設定
 */
export async function toggleHelpVideoAudioSetting(
	current: boolean,
): Promise<boolean> {
	const updated = await updateUserSettings({ play_help_video_audio: !current });
	return updated.play_help_video_audio;
}
