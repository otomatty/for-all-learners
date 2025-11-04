"use client";

/**
 * Plugin Reviews List Component
 *
 * Displays reviews for a plugin with pagination and helpful votes.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/PluginDetails.tsx
 *
 * Dependencies:
 *   ├─ app/_actions/plugin-ratings-reviews.ts
 *   ├─ components/ui/button.tsx
 *   ├─ components/ui/card.tsx
 *   └─ sonner (toast)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { ThumbsUp } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	getPluginReviews,
	type PluginReviewWithUser,
	toggleReviewHelpful,
} from "@/app/_actions/plugin-ratings-reviews";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface PluginReviewsListProps {
	/**
	 * Plugin ID
	 */
	pluginId: string;

	/**
	 * Initial reviews (optional, for SSR)
	 */
	initialReviews?: PluginReviewWithUser[];

	/**
	 * Initial total count (optional, for SSR)
	 */
	initialTotal?: number;
}

const REVIEWS_PER_PAGE = 10;

export function PluginReviewsList({
	pluginId,
	initialReviews,
	initialTotal,
}: PluginReviewsListProps) {
	const [reviews, setReviews] = useState<PluginReviewWithUser[]>(
		initialReviews || [],
	);
	const [total, setTotal] = useState(initialTotal || 0);
	const [currentPage, setCurrentPage] = useState(1);
	const [sortBy, setSortBy] = useState<"created_at" | "helpful_count">(
		"created_at",
	);
	const [isPending, startTransition] = useTransition();
	const [isLoading, setIsLoading] = useState(!initialReviews);

	// Load reviews
	useEffect(() => {
		async function loadReviews() {
			setIsLoading(true);
			try {
				const offset = (currentPage - 1) * REVIEWS_PER_PAGE;
				const result = await getPluginReviews(
					pluginId,
					REVIEWS_PER_PAGE,
					offset,
					sortBy,
				);
				setReviews(result.reviews);
				setTotal(result.total);
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "レビューの読み込みに失敗しました",
				);
			} finally {
				setIsLoading(false);
			}
		}

		if (!initialReviews || currentPage > 1) {
			loadReviews();
		}
	}, [pluginId, currentPage, sortBy, initialReviews]);

	const handleToggleHelpful = (reviewId: string) => {
		startTransition(async () => {
			try {
				const result = await toggleReviewHelpful(reviewId);
				if (result.success) {
					// Update local state
					setReviews((prev) =>
						prev.map((review) => {
							if (review.id === reviewId) {
								return {
									...review,
									isHelpful: result.isHelpful,
									helpfulCount: result.isHelpful
										? review.helpfulCount + 1
										: review.helpfulCount - 1,
								};
							}
							return review;
						}),
					);
				} else {
					toast.error(result.error || "投票に失敗しました");
				}
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "投票に失敗しました",
				);
			}
		});
	};

	const totalPages = Math.ceil(total / REVIEWS_PER_PAGE);

	if (isLoading && reviews.length === 0) {
		return (
			<div className="space-y-4">
				<div className="text-sm text-muted-foreground">読み込み中...</div>
			</div>
		);
	}

	if (reviews.length === 0) {
		return (
			<div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
				レビューはまだありません
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Sort Controls */}
			<div className="flex items-center justify-between">
				<div className="text-sm font-medium">{total}件のレビュー</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						size="sm"
						variant={sortBy === "created_at" ? "default" : "outline"}
						onClick={() => setSortBy("created_at")}
					>
						最新順
					</Button>
					<Button
						type="button"
						size="sm"
						variant={sortBy === "helpful_count" ? "default" : "outline"}
						onClick={() => setSortBy("helpful_count")}
					>
						役立った順
					</Button>
				</div>
			</div>

			{/* Reviews List */}
			<div className="space-y-4">
				{reviews.map((review) => (
					<Card key={review.id}>
						<CardHeader>
							<div className="flex items-start justify-between">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-2">
										<span className="font-semibold text-sm">
											{review.user.name || review.user.email.split("@")[0]}
										</span>
										<span className="text-xs text-muted-foreground">
											{new Date(review.createdAt).toLocaleDateString("ja-JP")}
										</span>
										{review.updatedAt.getTime() !==
											review.createdAt.getTime() && (
											<span className="text-xs text-muted-foreground">
												（編集済み）
											</span>
										)}
									</div>
									{review.title && (
										<h4 className="font-semibold text-sm mb-2">
											{review.title}
										</h4>
									)}
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
								{review.content}
							</p>
							<div className="flex items-center gap-4">
								<Button
									type="button"
									size="sm"
									variant={review.isHelpful ? "default" : "outline"}
									className="gap-2"
									onClick={() => handleToggleHelpful(review.id)}
									disabled={isPending}
								>
									<ThumbsUp className="h-4 w-4" />
									役立った ({review.helpfulCount})
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						disabled={currentPage === 1 || isLoading}
					>
						前へ
					</Button>
					<span className="text-sm text-muted-foreground">
						ページ {currentPage} / {totalPages}
					</span>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						disabled={currentPage === totalPages || isLoading}
					>
						次へ
					</Button>
				</div>
			)}
		</div>
	);
}
