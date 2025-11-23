"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface PluginRating {
	id: string;
	userId: string;
	pluginId: string;
	rating: number;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Submit or update a plugin rating
 */
export function useSubmitRating() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			pluginId,
			rating,
		}: {
			pluginId: string;
			rating: number;
		}): Promise<void> => {
			// Validate inputs
			if (!pluginId || pluginId.trim().length === 0) {
				throw new Error("プラグインIDが必要です");
			}

			if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
				throw new Error("レーティングは1〜5の整数である必要があります");
			}

			// Authenticate user
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

			// Submit rating
			const { error } = await supabase.from("plugin_ratings").upsert(
				{
					user_id: user.id,
					plugin_id: pluginId,
					rating,
				},
				{
					onConflict: "user_id,plugin_id",
				},
			);

			if (error) {
				throw error;
			}
		},
		onSuccess: (_, variables) => {
			// Invalidate rating queries
			queryClient.invalidateQueries({
				queryKey: ["plugins", "ratings", variables.pluginId],
			});
			queryClient.invalidateQueries({
				queryKey: ["plugins", "ratings", "user", variables.pluginId],
			});
		},
	});
}

/**
 * Get user's rating for a plugin
 */
export function useGetUserRating(pluginId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["plugins", "ratings", "user", pluginId],
		queryFn: async (): Promise<PluginRating | null> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

			const { data, error } = await supabase
				.from("plugin_ratings")
				.select("*")
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					// No rows found
					return null;
				}
				throw error;
			}

			return data
				? {
						id: data.id,
						userId: data.user_id,
						pluginId: data.plugin_id,
						rating: data.rating,
						createdAt: new Date(data.created_at ?? new Date()),
						updatedAt: new Date(data.updated_at ?? new Date()),
					}
				: null;
		},
		enabled: !!pluginId,
	});
}

/**
 * Delete user's rating for a plugin
 */
export function useDeleteRating() {
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
				.from("plugin_ratings")
				.delete()
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId);

			if (error) {
				throw error;
			}
		},
		onSuccess: (_, pluginId) => {
			// Invalidate rating queries
			queryClient.invalidateQueries({
				queryKey: ["plugins", "ratings", pluginId],
			});
			queryClient.invalidateQueries({
				queryKey: ["plugins", "ratings", "user", pluginId],
			});
		},
	});
}
