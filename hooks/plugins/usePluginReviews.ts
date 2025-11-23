"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface PluginReview {
	id: string;
	userId: string;
	pluginId: string;
	title: string | null;
	content: string;
	helpfulCount: number;
	createdAt: Date;
	updatedAt: Date;
	userName?: string;
	userEmail?: string;
	isHelpful?: boolean; // Whether current user marked as helpful
}

export interface PluginReviewWithUser extends PluginReview {
	user: {
		id: string;
		name: string | null;
		email: string;
	};
}

/**
 * Submit or update a plugin review
 */
export function useSubmitReview() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			pluginId,
			content,
			title,
		}: {
			pluginId: string;
			content: string;
			title?: string | null;
		}): Promise<{ reviewId: string }> => {
			// Validate inputs
			if (!pluginId || pluginId.trim().length === 0) {
				throw new Error("プラグインIDが必要です");
			}

			if (!content || content.trim().length === 0) {
				throw new Error("レビュー内容を入力してください");
			}

			if (content.length > 5000) {
				throw new Error("レビュー内容は5000文字以内で入力してください");
			}

			if (title && title.length > 200) {
				throw new Error("タイトルは200文字以内で入力してください");
			}

			// Authenticate user
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

			// Check if user already has a review for this plugin
			const { data: existingReview } = await supabase
				.from("plugin_reviews")
				.select("id")
				.eq("user_id", user.id)
				.eq("plugin_id", pluginId)
				.single();

			let reviewId: string;

			if (existingReview) {
				// Update existing review
				const { data, error } = await supabase
					.from("plugin_reviews")
					.update({
						title: title?.trim() || null,
						content: content.trim(),
						updated_at: new Date().toISOString(),
					})
					.eq("id", existingReview.id)
					.select("id")
					.single();

				if (error) {
					throw error;
				}

				reviewId = data.id;
			} else {
				// Create new review
				const { data, error } = await supabase
					.from("plugin_reviews")
					.insert({
						user_id: user.id,
						plugin_id: pluginId,
						title: title?.trim() || null,
						content: content.trim(),
					})
					.select("id")
					.single();

				if (error) {
					throw error;
				}

				reviewId = data.id;
			}

			return { reviewId };
		},
		onSuccess: (_, variables) => {
			// Invalidate review queries
			queryClient.invalidateQueries({
				queryKey: ["plugins", "reviews", variables.pluginId],
			});
			queryClient.invalidateQueries({
				queryKey: ["plugins", "reviews", "user", variables.pluginId],
			});
		},
	});
}

/**
 * Get reviews for a plugin
 */
export function usePluginReviews(
	pluginId: string,
	options?: {
		limit?: number;
		offset?: number;
		sortBy?: "created_at" | "helpful_count";
	},
) {
	const supabase = createClient();
	const limit = options?.limit || 10;
	const offset = options?.offset || 0;
	const sortBy = options?.sortBy || "created_at";

	return useQuery({
		queryKey: ["plugins", "reviews", pluginId, limit, offset, sortBy],
		queryFn: async (): Promise<{
			reviews: PluginReviewWithUser[];
			total: number;
		}> => {
			// Get current user if authenticated
			const {
				data: { user: currentUser },
			} = await supabase.auth.getUser();

			// Build query
			const query = supabase
				.from("plugin_reviews")
				.select(
					`
        *,
        accounts!plugin_reviews_user_id_fkey (
          id,
          full_name,
          email
        )
      `,
					{ count: "exact" },
				)
				.eq("plugin_id", pluginId)
				.order(sortBy === "helpful_count" ? "helpful_count" : "created_at", {
					ascending: false,
				})
				.range(offset, offset + limit - 1);

			const { data, error, count } = await query;

			if (error) {
				throw error;
			}

			// Get helpful votes for current user if authenticated
			const helpfulVoteIds = currentUser
				? await (async () => {
						const { data: helpfulVotes } = await supabase
							.from("plugin_review_helpful")
							.select("review_id")
							.eq("user_id", currentUser.id)
							.in(
								"review_id",
								(data || []).map((r) => r.id),
							);

						return new Set(helpfulVotes?.map((v) => v.review_id) || []);
					})()
				: new Set<string>();

			// Map results
			const reviews: PluginReviewWithUser[] = (data || []).map((row) => {
				const account = row.accounts as {
					id: string;
					full_name: string | null;
					email: string;
				};

				return {
					id: row.id,
					userId: row.user_id,
					pluginId: row.plugin_id,
					title: row.title,
					content: row.content,
					helpfulCount: row.helpful_count ?? 0,
					createdAt: new Date(row.created_at ?? new Date()),
					updatedAt: new Date(row.updated_at ?? new Date()),
					user: {
						id: account.id,
						name: account.full_name,
						email: account.email,
					},
					isHelpful: helpfulVoteIds.has(row.id),
				};
			});

			return {
				reviews,
				total: count || 0,
			};
		},
		enabled: !!pluginId,
	});
}

/**
 * Get user's review for a plugin
 */
export function useGetUserReview(pluginId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["plugins", "reviews", "user", pluginId],
		queryFn: async (): Promise<PluginReview | null> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

			const { data, error } = await supabase
				.from("plugin_reviews")
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
						title: data.title,
						content: data.content,
						helpfulCount: data.helpful_count ?? 0,
						createdAt: new Date(data.created_at ?? new Date()),
						updatedAt: new Date(data.updated_at ?? new Date()),
					}
				: null;
		},
		enabled: !!pluginId,
	});
}

/**
 * Delete user's review
 */
export function useDeleteReview() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (reviewId: string): Promise<string> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

			// Verify ownership
			const { data: review } = await supabase
				.from("plugin_reviews")
				.select("user_id, plugin_id")
				.eq("id", reviewId)
				.single();

			if (!review || review.user_id !== user.id) {
				throw new Error("このレビューを削除する権限がありません");
			}

			// Delete review
			const { error } = await supabase
				.from("plugin_reviews")
				.delete()
				.eq("id", reviewId);

			if (error) {
				throw error;
			}

			// Return pluginId for cache invalidation
			return review.plugin_id;
		},
		onSuccess: (pluginId) => {
			// Invalidate review queries
			queryClient.invalidateQueries({
				queryKey: ["plugins", "reviews", pluginId],
			});
			queryClient.invalidateQueries({
				queryKey: ["plugins", "reviews", "user", pluginId],
			});
		},
	});
}

/**
 * Toggle helpful vote for a review
 */
export function useToggleHelpful() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (reviewId: string): Promise<boolean> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError || !user) {
				throw new Error("ユーザーが認証されていません");
			}

			// Use RPC function for atomic toggle operation
			const { data, error } = await supabase.rpc("toggle_review_helpful", {
				p_review_id: reviewId,
			});

			if (error) {
				throw error;
			}

			// RPC function returns true if vote was added, false if removed
			return data === true;
		},
		onSuccess: () => {
			// Invalidate all review queries to refresh helpful counts
			queryClient.invalidateQueries({
				queryKey: ["plugins", "reviews"],
			});
		},
	});
}
