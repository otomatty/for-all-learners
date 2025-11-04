/**
 * Plugin Ratings and Reviews Server Actions
 *
 * Provides CRUD operations for plugin ratings and reviews.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/page.tsx
 *   └─ app/(protected)/settings/plugins/_components/* (review components)
 *
 * Dependencies:
 *   ├─ lib/supabase/server.ts
 *   ├─ types/database.types.ts
 *   └─ lib/logger.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

"use server";

import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

// ============================================================================
// Type Definitions
// ============================================================================

type PluginRatingRow = Database["public"]["Tables"]["plugin_ratings"]["Row"];
type PluginReviewRow = Database["public"]["Tables"]["plugin_reviews"]["Row"];

export interface PluginRating {
	id: string;
	userId: string;
	pluginId: string;
	rating: number;
	createdAt: Date;
	updatedAt: Date;
}

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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get authenticated user
 */
async function getAuthenticatedUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		throw new Error(error?.message || "User not authenticated");
	}

	return user;
}

/**
 * Map database row to PluginRating
 */
function mapRatingRow(row: PluginRatingRow): PluginRating {
	return {
		id: row.id,
		userId: row.user_id,
		pluginId: row.plugin_id,
		rating: row.rating,
		createdAt: new Date(row.created_at ?? new Date()),
		updatedAt: new Date(row.updated_at ?? new Date()),
	};
}

/**
 * Map database row to PluginReview
 */
function mapReviewRow(row: PluginReviewRow): PluginReview {
	return {
		id: row.id,
		userId: row.user_id,
		pluginId: row.plugin_id,
		title: row.title,
		content: row.content,
		helpfulCount: row.helpful_count ?? 0,
		createdAt: new Date(row.created_at ?? new Date()),
		updatedAt: new Date(row.updated_at ?? new Date()),
	};
}

// ============================================================================
// Rating Actions
// ============================================================================

/**
 * Submit or update a plugin rating
 *
 * @param pluginId Plugin ID
 * @param rating Rating value (1-5)
 */
export async function submitPluginRating(
	pluginId: string,
	rating: number,
): Promise<{ success: boolean; error?: string }> {
	let user: { id: string } | null = null;

	try {
		// Validate inputs
		if (!pluginId || pluginId.trim().length === 0) {
			return { success: false, error: "プラグインIDが必要です" };
		}

		if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
			return {
				success: false,
				error: "レーティングは1〜5の整数である必要があります",
			};
		}

		// Authenticate user
		user = await getAuthenticatedUser();

		// Submit rating
		const supabase = await createClient();
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
			logger.error(
				{ error, pluginId, rating, userId: user.id },
				"[plugin-rating] Failed to submit rating",
			);
			return { success: false, error: "レーティングの投稿に失敗しました" };
		}

		return { success: true };
	} catch (error) {
		logger.error(
			{ error, pluginId, rating, userId: user?.id },
			"[plugin-rating] Error submitting rating",
		);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "レーティングの投稿に失敗しました",
		};
	}
}

/**
 * Get user's rating for a plugin
 *
 * @param pluginId Plugin ID
 * @returns User's rating or null if not rated
 */
export async function getUserRating(
	pluginId: string,
): Promise<PluginRating | null> {
	let user: { id: string } | null = null;

	try {
		user = await getAuthenticatedUser();

		const supabase = await createClient();
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
			logger.error(
				{ error, pluginId, userId: user.id },
				"[plugin-rating] Failed to get user rating",
			);
			throw error;
		}

		return data ? mapRatingRow(data) : null;
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugin-rating] Error getting user rating",
		);
		throw error;
	}
}

/**
 * Delete user's rating for a plugin
 *
 * @param pluginId Plugin ID
 */
export async function deletePluginRating(
	pluginId: string,
): Promise<{ success: boolean; error?: string }> {
	let user: { id: string } | null = null;

	try {
		user = await getAuthenticatedUser();

		const supabase = await createClient();
		const { error } = await supabase
			.from("plugin_ratings")
			.delete()
			.eq("user_id", user.id)
			.eq("plugin_id", pluginId);

		if (error) {
			logger.error(
				{ error, pluginId, userId: user.id },
				"[plugin-rating] Failed to delete rating",
			);
			return { success: false, error: "レーティングの削除に失敗しました" };
		}

		return { success: true };
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugin-rating] Error deleting rating",
		);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "レーティングの削除に失敗しました",
		};
	}
}

// ============================================================================
// Review Actions
// ============================================================================

/**
 * Submit or update a plugin review
 *
 * @param pluginId Plugin ID
 * @param title Review title (optional)
 * @param content Review content
 */
export async function submitPluginReview(
	pluginId: string,
	content: string,
	title?: string | null,
): Promise<{ success: boolean; error?: string; reviewId?: string }> {
	let user: { id: string } | null = null;

	try {
		// Validate inputs
		if (!pluginId || pluginId.trim().length === 0) {
			return { success: false, error: "プラグインIDが必要です" };
		}

		if (!content || content.trim().length === 0) {
			return { success: false, error: "レビュー内容を入力してください" };
		}

		if (content.length > 5000) {
			return {
				success: false,
				error: "レビュー内容は5000文字以内で入力してください",
			};
		}

		if (title && title.length > 200) {
			return {
				success: false,
				error: "タイトルは200文字以内で入力してください",
			};
		}

		// Authenticate user
		user = await getAuthenticatedUser();

		// Check if user already has a review for this plugin
		const supabase = await createClient();
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
				logger.error(
					{ error, pluginId, userId: user.id },
					"[plugin-review] Failed to update review",
				);
				return { success: false, error: "レビューの更新に失敗しました" };
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
				logger.error(
					{ error, pluginId, userId: user.id },
					"[plugin-review] Failed to create review",
				);
				return { success: false, error: "レビューの投稿に失敗しました" };
			}

			reviewId = data.id;
		}

		return { success: true, reviewId };
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugin-review] Error submitting review",
		);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "レビューの投稿に失敗しました",
		};
	}
}

/**
 * Get reviews for a plugin
 *
 * @param pluginId Plugin ID
 * @param limit Number of reviews to fetch
 * @param offset Offset for pagination
 * @param sortBy Sort by "created_at" or "helpful_count"
 */
export async function getPluginReviews(
	pluginId: string,
	limit = 10,
	offset = 0,
	sortBy: "created_at" | "helpful_count" = "created_at",
): Promise<{
	reviews: PluginReviewWithUser[];
	total: number;
}> {
	let user: { id: string } | null = null;

	try {
		const supabase = await createClient();

		// Get current user if authenticated
		const {
			data: { user: currentUser },
		} = await supabase.auth.getUser();
		user = currentUser;

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
			logger.error(
				{ error, pluginId },
				"[plugin-review] Failed to get reviews",
			);
			throw error;
		}

		// Get helpful votes for current user if authenticated
		const helpfulVoteIds = user
			? await (async () => {
					const { data: helpfulVotes } = await supabase
						.from("plugin_review_helpful")
						.select("review_id")
						.eq("user_id", user.id)
						.in(
							"review_id",
							(data || []).map((r) => r.id),
						);

					return new Set(helpfulVotes?.map((v) => v.review_id) || []);
				})()
			: new Set<string>();

		// Map results
		const reviews: PluginReviewWithUser[] = (data || []).map((row) => {
			const review = mapReviewRow(row);
			const account = row.accounts as {
				id: string;
				full_name: string | null;
				email: string;
			};

			return {
				...review,
				user: {
					id: account.id,
					name: account.full_name,
					email: account.email,
				},
				isHelpful: helpfulVoteIds.has(review.id),
			};
		});

		return {
			reviews,
			total: count || 0,
		};
	} catch (error) {
		logger.error({ error, pluginId }, "[plugin-review] Error getting reviews");
		throw error;
	}
}

/**
 * Get user's review for a plugin
 *
 * @param pluginId Plugin ID
 * @returns User's review or null if not reviewed
 */
export async function getUserReview(
	pluginId: string,
): Promise<PluginReview | null> {
	let user: { id: string } | null = null;

	try {
		user = await getAuthenticatedUser();

		const supabase = await createClient();
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
			logger.error(
				{ error, pluginId, userId: user.id },
				"[plugin-review] Failed to get user review",
			);
			throw error;
		}

		return data ? mapReviewRow(data) : null;
	} catch (error) {
		logger.error(
			{ error, pluginId, userId: user?.id },
			"[plugin-review] Error getting user review",
		);
		throw error;
	}
}

/**
 * Delete user's review
 *
 * @param reviewId Review ID
 */
export async function deletePluginReview(
	reviewId: string,
): Promise<{ success: boolean; error?: string }> {
	let user: { id: string } | null = null;

	try {
		user = await getAuthenticatedUser();

		const supabase = await createClient();

		// Verify ownership
		const { data: review } = await supabase
			.from("plugin_reviews")
			.select("user_id")
			.eq("id", reviewId)
			.single();

		if (!review || review.user_id !== user.id) {
			return {
				success: false,
				error: "このレビューを削除する権限がありません",
			};
		}

		// Delete review
		const { error } = await supabase
			.from("plugin_reviews")
			.delete()
			.eq("id", reviewId);

		if (error) {
			logger.error(
				{ error, reviewId, userId: user.id },
				"[plugin-review] Failed to delete review",
			);
			return { success: false, error: "レビューの削除に失敗しました" };
		}

		return { success: true };
	} catch (error) {
		logger.error(
			{ error, reviewId, userId: user?.id },
			"[plugin-review] Error deleting review",
		);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "レビューの削除に失敗しました",
		};
	}
}

/**
 * Toggle helpful vote for a review
 *
 * @param reviewId Review ID
 */
export async function toggleReviewHelpful(
	reviewId: string,
): Promise<{ success: boolean; error?: string; isHelpful: boolean }> {
	let user: { id: string } | null = null;

	try {
		user = await getAuthenticatedUser();

		const supabase = await createClient();

		// Check if vote already exists
		const { data: existingVote } = await supabase
			.from("plugin_review_helpful")
			.select("id")
			.eq("user_id", user.id)
			.eq("review_id", reviewId)
			.single();

		if (existingVote) {
			// Remove vote
			const { error } = await supabase
				.from("plugin_review_helpful")
				.delete()
				.eq("id", existingVote.id);

			if (error) {
				logger.error(
					{ error, reviewId, userId: user.id },
					"[plugin-review] Failed to remove helpful vote",
				);
				return {
					success: false,
					error: "投票の削除に失敗しました",
					isHelpful: false,
				};
			}

			return { success: true, isHelpful: false };
		}

		// Add vote
		const { error } = await supabase.from("plugin_review_helpful").insert({
			user_id: user.id,
			review_id: reviewId,
		});

		if (error) {
			logger.error(
				{ error, reviewId, userId: user.id },
				"[plugin-review] Failed to add helpful vote",
			);
			return {
				success: false,
				error: "投票の追加に失敗しました",
				isHelpful: false,
			};
		}

		return { success: true, isHelpful: true };
	} catch (error) {
		logger.error(
			{ error, reviewId, userId: user?.id },
			"[plugin-review] Error toggling helpful vote",
		);
		return {
			success: false,
			error: error instanceof Error ? error.message : "投票に失敗しました",
			isHelpful: false,
		};
	}
}
