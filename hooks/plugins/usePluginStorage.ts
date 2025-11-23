"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Json = Database["public"]["Tables"]["plugin_storage"]["Row"]["value"];

/**
 * Get value from plugin storage
 */
export function useGetPluginStorage(pluginId: string, key: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["plugins", "storage", pluginId, key],
		queryFn: async (): Promise<unknown | undefined> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

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
		},
		enabled: !!pluginId && !!key,
	});
}

/**
 * Set value in plugin storage
 */
export function useSetPluginStorage() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			pluginId,
			key,
			value,
		}: {
			pluginId: string;
			key: string;
			value: unknown;
		}): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

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
		},
		onSuccess: (_, variables) => {
			// Invalidate storage queries
			queryClient.invalidateQueries({
				queryKey: ["plugins", "storage", variables.pluginId, variables.key],
			});
			queryClient.invalidateQueries({
				queryKey: ["plugins", "storage", variables.pluginId],
			});
		},
	});
}

/**
 * Delete value from plugin storage
 */
export function useDeletePluginStorage() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			pluginId,
			key,
		}: {
			pluginId: string;
			key: string;
		}): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

			const { error } = await supabase
				.from("plugin_storage")
				.delete()
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId)
				.eq("key", key);

			if (error) {
				throw error;
			}
		},
		onSuccess: (_, variables) => {
			// Invalidate storage queries
			queryClient.invalidateQueries({
				queryKey: ["plugins", "storage", variables.pluginId, variables.key],
			});
			queryClient.invalidateQueries({
				queryKey: ["plugins", "storage", variables.pluginId],
			});
		},
	});
}

/**
 * Get all keys in plugin storage
 */
export function useListPluginStorageKeys(pluginId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["plugins", "storage", pluginId, "keys"],
		queryFn: async (): Promise<string[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

			const { data, error } = await supabase
				.from("plugin_storage")
				.select("key")
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId);

			if (error) {
				throw error;
			}

			return data?.map((row) => row.key) || [];
		},
		enabled: !!pluginId,
	});
}

/**
 * Clear all data from plugin storage
 */
export function useClearPluginStorage() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (pluginId: string): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

			const { error } = await supabase
				.from("plugin_storage")
				.delete()
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId);

			if (error) {
				throw error;
			}
		},
		onSuccess: (pluginId) => {
			// Invalidate all storage queries for this plugin
			queryClient.invalidateQueries({
				queryKey: ["plugins", "storage", pluginId],
			});
		},
	});
}

/**
 * Get all key-value pairs from plugin storage
 */
export function useGetAllPluginStorage(pluginId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["plugins", "storage", pluginId, "all"],
		queryFn: async (): Promise<Record<string, unknown>> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

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
		},
		enabled: !!pluginId,
	});
}
