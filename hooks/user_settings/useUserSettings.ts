"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
type UserSettingsUpdate =
	Database["public"]["Tables"]["user_settings"]["Update"];

/**
 * Hook for fetching user settings
 * If no settings exist, initializes with default values
 */
export function useUserSettings() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["user_settings"],
		queryFn: async (): Promise<UserSettings> => {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				// Return default settings for unauthenticated users
				return {
					theme: "light",
					mode: "system",
				} as UserSettings;
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
				// Initialize settings if they don't exist
				return await initializeUserSettings(supabase, user.id);
			}

			return data;
		},
	});
}

/**
 * Hook for updating user settings
 */
export function useUpdateUserSettings() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			updates: Partial<UserSettingsUpdate>,
		): Promise<UserSettings> => {
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
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user_settings"] });
		},
	});
}

/**
 * Hook for initializing user settings with default values
 */
export function useInitializeUserSettings() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (): Promise<UserSettings> => {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				throw new Error(authError?.message ?? "Not authenticated");
			}

			return await initializeUserSettings(supabase, user.id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user_settings"] });
		},
	});
}

/**
 * Helper function to initialize user settings
 */
async function initializeUserSettings(
	supabase: ReturnType<typeof createClient>,
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
