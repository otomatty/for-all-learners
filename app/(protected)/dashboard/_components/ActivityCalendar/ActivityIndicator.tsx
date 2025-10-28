/**
 * Activity Indicator Component
 *
 * 日別の活動状況を視覚的に表示するコンポーネント
 */

import { ACTIVITY_ICONS } from "./constants";
import type { DailyActivitySummary } from "./types";

interface ActivityIndicatorProps {
	summary: DailyActivitySummary;
}

export function ActivityIndicator({ summary }: ActivityIndicatorProps) {
	if (summary.activityLevel === "none") {
		return <div className="text-xs text-gray-400">活動なし</div>;
	}

	return (
		<div className="space-y-1 text-xs">
			{/* 学習活動 */}
			{summary.learning.totalCards > 0 && (
				<div className="flex items-center gap-1 text-gray-700">
					<span>{ACTIVITY_ICONS.card_review}</span>
					<span className="font-medium">{summary.learning.totalCards}</span>
				</div>
			)}

			{/* ノート活動 */}
			{summary.notes.pagesCreated > 0 && (
				<div className="flex items-center gap-1 text-gray-700">
					<span>{ACTIVITY_ICONS.page_created}</span>
					<span className="font-medium">{summary.notes.pagesCreated}</span>
				</div>
			)}

			{summary.notes.pagesUpdated > 0 && (
				<div className="flex items-center gap-1 text-gray-700">
					<span>{ACTIVITY_ICONS.page_updated}</span>
					<span className="font-medium">{summary.notes.pagesUpdated}</span>
				</div>
			)}

			{/* 学習時間 */}
			{summary.learning.totalMinutes > 0 && (
				<div className="flex items-center gap-1 text-gray-600">
					<span>{ACTIVITY_ICONS.time}</span>
					<span className="font-medium">{summary.learning.totalMinutes}m</span>
				</div>
			)}
		</div>
	);
}
