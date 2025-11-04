"use client";

/**
 * Plugin Details Component
 *
 * Displays plugin details with rating and review functionality.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/page.tsx
 *
 * Dependencies:
 *   ├─ app/_actions/plugin-ratings-reviews.ts
 *   ├─ ./PluginRatingForm.tsx
 *   ├─ ./PluginReviewForm.tsx
 *   ├─ ./PluginReviewsList.tsx
 *   ├─ components/ui/card.tsx
 *   └─ components/ui/tabs.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { useEffect, useState } from "react";
import { getPluginReviews } from "@/app/_actions/plugin-ratings-reviews";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PluginMetadata } from "@/types/plugin";
import { PluginRatingForm } from "./PluginRatingForm";
import { PluginReviewForm } from "./PluginReviewForm";
import { PluginReviewsList } from "./PluginReviewsList";

interface PluginDetailsProps {
	/**
	 * Plugin metadata
	 */
	plugin: PluginMetadata;
}

export function PluginDetails({ plugin }: PluginDetailsProps) {
	const [reviews, setReviews] = useState<Awaited<
		ReturnType<typeof getPluginReviews>
	> | null>(null);
	const [isLoadingReviews, setIsLoadingReviews] = useState(true);

	// Load initial reviews
	useEffect(() => {
		async function loadReviews() {
			try {
				const result = await getPluginReviews(plugin.pluginId, 10, 0);
				setReviews(result);
			} catch (error) {
				// Error handling is done silently
				void error;
			} finally {
				setIsLoadingReviews(false);
			}
		}

		loadReviews();
	}, [plugin.pluginId]);

	const handleRatingSubmitted = () => {
		// Refresh reviews if needed
		// The rating will be updated via trigger in the database
	};

	const handleReviewSubmitted = () => {
		// Refresh reviews list
		async function refreshReviews() {
			try {
				const result = await getPluginReviews(plugin.pluginId, 10, 0);
				setReviews(result);
			} catch (error) {
				// Error handling is done silently
				void error;
			}
		}

		refreshReviews();
	};

	return (
		<div className="space-y-6">
			{/* Plugin Info Card */}
			<Card>
				<CardHeader>
					<CardTitle>{plugin.name}</CardTitle>
					<CardDescription>{plugin.description}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm">
						<div className="flex items-center gap-4">
							<span className="text-muted-foreground">バージョン:</span>
							<span>{plugin.version}</span>
						</div>
						<div className="flex items-center gap-4">
							<span className="text-muted-foreground">作成者:</span>
							<span>{plugin.author}</span>
						</div>
						{plugin.ratingAverage && (
							<div className="flex items-center gap-4">
								<span className="text-muted-foreground">平均評価:</span>
								<span>
									{plugin.ratingAverage.toFixed(1)} / 5.0 (
									{plugin.ratingCount ?? 0}件)
								</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Rating and Reviews Tabs */}
			<Tabs defaultValue="rating" className="w-full">
				<TabsList>
					<TabsTrigger value="rating">評価</TabsTrigger>
					<TabsTrigger value="reviews">
						レビュー ({reviews?.total || 0})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="rating" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>プラグインを評価</CardTitle>
							<CardDescription>
								このプラグインの評価を星で表してください（1〜5）
							</CardDescription>
						</CardHeader>
						<CardContent>
							<PluginRatingForm
								pluginId={plugin.pluginId}
								onRatingSubmitted={handleRatingSubmitted}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="reviews" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>レビューを投稿</CardTitle>
							<CardDescription>
								このプラグインについてのレビューを書いてください
							</CardDescription>
						</CardHeader>
						<CardContent>
							<PluginReviewForm
								pluginId={plugin.pluginId}
								onReviewSubmitted={handleReviewSubmitted}
							/>
						</CardContent>
					</Card>

					{isLoadingReviews ? (
						<div className="text-center text-sm text-muted-foreground py-8">
							読み込み中...
						</div>
					) : (
						<PluginReviewsList
							pluginId={plugin.pluginId}
							initialReviews={reviews?.reviews}
							initialTotal={reviews?.total}
						/>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
