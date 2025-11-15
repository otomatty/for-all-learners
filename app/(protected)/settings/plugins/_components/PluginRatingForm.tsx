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
 *   ├─ app/_actions/plugin-ratings-reviews.ts
 *   ├─ ./StarRating.tsx
 *   ├─ components/ui/button.tsx
 *   └─ sonner (toast)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	deletePluginRating,
	getUserRating,
	submitPluginRating,
} from "@/app/_actions/plugin-ratings-reviews";
import { Button } from "@/components/ui/button";
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
	const [userRating, setUserRating] = useState<number | null>(null);
	const [isPending, startTransition] = useTransition();
	const [isLoading, setIsLoading] = useState(true);

	// Load user's existing rating
	useEffect(() => {
		async function loadUserRating() {
			try {
				const existingRating = await getUserRating(pluginId);
				if (existingRating) {
					setRating(existingRating.rating);
					setUserRating(existingRating.rating);
				}
			} catch (_error) {
			} finally {
				setIsLoading(false);
			}
		}

		loadUserRating();
	}, [pluginId]);

	const handleSubmit = () => {
		if (rating === 0) {
			toast.error("星評価を選択してください");
			return;
		}

		startTransition(async () => {
			try {
				const result = await submitPluginRating(pluginId, rating);
				if (result.success) {
					setUserRating(rating);
					toast.success("レーティングを投稿しました");
					onRatingSubmitted?.();
				} else {
					toast.error(result.error || "レーティングの投稿に失敗しました");
				}
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "レーティングの投稿に失敗しました",
				);
			}
		});
	};

	const handleDelete = () => {
		startTransition(async () => {
			try {
				const result = await deletePluginRating(pluginId);
				if (result.success) {
					setRating(0);
					setUserRating(null);
					toast.success("レーティングを削除しました");
					onRatingSubmitted?.();
				} else {
					toast.error(result.error || "レーティングの削除に失敗しました");
				}
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "レーティングの削除に失敗しました",
				);
			}
		});
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
					disabled={isPending || rating === 0}
				>
					{userRating ? "評価を更新" : "評価を投稿"}
				</Button>

				{userRating && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={handleDelete}
						disabled={isPending}
					>
						評価を削除
					</Button>
				)}
			</div>
		</div>
	);
}
