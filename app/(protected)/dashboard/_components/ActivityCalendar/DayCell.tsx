/**
 * Day Cell Component
 *
 * カレンダーの日付セルを表示するコンポーネント
 */

import { cn } from "@/lib/utils";
import { ActivityIndicator } from "./ActivityIndicator";
import { ACTIVITY_COLORS } from "./constants";
import type { DailyActivitySummary } from "./types";

interface DayCellProps {
	day: DailyActivitySummary | null;
	isSelected: boolean;
	onClick?: () => void;
}

export function DayCell({ day, isSelected, onClick }: DayCellProps) {
	// 前月・翌月の空セル
	if (!day) {
		return <div className="bg-muted min-h-24 border border-border" />;
	}

	const dayNumber = new Date(day.date).getDate();
	const activityColor = ACTIVITY_COLORS[day.activityLevel];

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"bg-background p-2 min-h-24 hover:bg-accent transition-colors",
				"flex flex-col items-start text-left",
				"border border-border",
				"focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset",
				isSelected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950",
				day.isToday && "ring-2 ring-blue-400",
			)}
		>
			{/* 日付番号 */}
			<div className="flex items-center justify-between w-full mb-1">
				<span
					className={cn(
						"text-sm font-medium",
						day.isToday && "text-blue-600 font-bold",
						day.activityLevel !== "none" && activityColor.text,
					)}
				>
					{dayNumber}
				</span>

				{/* 活動レベルインジケーター */}
				{day.activityLevel !== "none" && (
					<span className="text-base">{activityColor.icon}</span>
				)}
			</div>

			{/* 活動サマリー */}
			<ActivityIndicator summary={day} />

			{/* プラグイン拡張バッジ */}
			{day.pluginExtensions && day.pluginExtensions.length > 0 && (
				<div className="flex flex-wrap gap-1 mt-1">
					{day.pluginExtensions.map((ext, index) => {
						if (!ext.badge) return null;
						return (
							<span
								key={index}
								className={cn(
									"text-xs px-1.5 py-0.5 rounded",
									ext.badgeColor ||
										"bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
								)}
								title={ext.tooltip || ext.badge}
							>
								{ext.badge}
							</span>
						);
					})}
				</div>
			)}
		</button>
	);
}
