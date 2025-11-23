"use client";

/**
 * Plugin Rating Form Component
 *
 * Allows users to submit or update their rating for a plugin.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/PluginDetails.tsx
 *
 * Dependencies:
 *   ├─ hooks/plugins/usePluginRatings.ts
 *   ├─ ./StarRating.tsx
 *   ├─ components/ui/button.tsx
 *   └─ sonner (toast)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	useDeleteRating,
	useGetUserRating,
	useSubmitRating,
} from "@/hooks/plugins/usePluginRatings";
import { StarRating } from "./StarRating";

interface PluginRatingFormProps {
	/**
	 * Plugin ID
	 */
	pluginId: string;

	/**
	 * Callback when rating is successfully submitted
	 */
	onRatingSubmitted?: () => void;
}

export function PluginRatingForm({
	pluginId,
	onRatingSubmitted,
}: PluginRatingFormProps) {
	const [rating, setRating] = useState(0);

	const { data: existingRating, isLoading } = useGetUserRating(pluginId);
	const submitRatingMutation = useSubmitRating();
	const deleteRatingMutation = useDeleteRating();

	const userRating = existingRating?.rating || null;

	// Load user's existing rating into form
	useEffect(() => {
		if (existingRating) {
			setRating(existingRating.rating);
		} else {
			setRating(0);
		}
	}, [existingRating]);

	const handleSubmit = async () => {
		if (rating === 0) {
			toast.error("星評価を選択してください");
			return;
		}

		try {
			await submitRatingMutation.mutateAsync({
				pluginId,
				rating,
			});
			toast.success("レーティングを投稿しました");
			onRatingSubmitted?.();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "レーティングの投稿に失敗しました",
			);
		}
	};

	const handleDelete = async () => {
		try {
			await deleteRatingMutation.mutateAsync(pluginId);
			setRating(0);
			toast.success("レーティングを削除しました");
			onRatingSubmitted?.();
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "レーティングの削除に失敗しました",
			);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				読み込み中...
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<span className="text-sm font-medium">あなたの評価:</span>
				<StarRating
					rating={rating}
					interactive
					onRatingChange={setRating}
					size="md"
				/>
			</div>

			<div className="flex items-center gap-2">
				<Button
					type="button"
					size="sm"
					onClick={handleSubmit}
					disabled={submitRatingMutation.isPending || rating === 0}
				>
					{userRating ? "評価を更新" : "評価を投稿"}
				</Button>

				{userRating && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={handleDelete}
						disabled={deleteRatingMutation.isPending}
					>
						評価を削除
					</Button>
				)}
			</div>
		</div>
	);
}
