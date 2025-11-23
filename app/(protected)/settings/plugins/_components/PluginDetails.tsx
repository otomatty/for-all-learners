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
 *   ├─ hooks/plugins/usePluginReviews.ts
 *   ├─ ./PluginRatingForm.tsx
 *   ├─ ./PluginReviewForm.tsx
 *   ├─ ./PluginReviewsList.tsx
 *   ├─ components/ui/card.tsx
 *   └─ components/ui/tabs.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePluginReviews } from "@/hooks/plugins/usePluginReviews";
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
	// Load initial reviews for display count
	const { data: reviewsData, isLoading: isLoadingReviews } = usePluginReviews(
		plugin.pluginId,
		{
			limit: 10,
			offset: 0,
		},
	);

	const handleRatingSubmitted = () => {
		// Rating mutations will automatically invalidate queries
		// No manual refresh needed
	};

	const handleReviewSubmitted = () => {
		// Review mutations will automatically invalidate queries
		// No manual refresh needed
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
						レビュー ({reviewsData?.total || 0})
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

					<PluginReviewsList
						pluginId={plugin.pluginId}
						initialReviews={reviewsData?.reviews}
						initialTotal={reviewsData?.total}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
