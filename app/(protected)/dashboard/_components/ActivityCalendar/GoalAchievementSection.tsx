/**
 * Goal Achievement Section Component
 *
 * 詳細パネル内の目標達成セクションを表示するコンポーネント
 */

import { CheckCircle2, XCircle } from "lucide-react";
import { ACTIVITY_ICONS } from "./constants";
import type { GoalAchievement } from "./types";

interface GoalAchievementSectionProps {
	achievements: GoalAchievement[];
}

export function GoalAchievementSection({
	achievements,
}: GoalAchievementSectionProps) {
	if (achievements.length === 0) {
		return null;
	}

	const achievedCount = achievements.filter((goal) => goal.achieved).length;
	const totalCount = achievements.length;

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold flex items-center gap-2">
					{ACTIVITY_ICONS.goal} 目標達成状況
				</h3>
				<div className="text-sm text-gray-600">
					{achievedCount}/{totalCount} 達成
				</div>
			</div>

			<div className="space-y-2">
				{achievements.map((goal) => (
					<div
						key={`${goal.goalTitle}-${goal.targetValue}`}
						className={`p-4 rounded-lg border ${
							goal.achieved
								? "bg-green-50 border-green-200"
								: "bg-gray-50 border-gray-200"
						}`}
					>
						<div className="flex items-start gap-3">
							{goal.achieved ? (
								<CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
							) : (
								<XCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
							)}

							<div className="flex-1 min-w-0">
								<div className="flex items-center justify-between gap-2 mb-1">
									<span
										className={`font-medium ${
											goal.achieved ? "text-green-900" : "text-gray-700"
										}`}
									>
										{goal.goalTitle}
									</span>
									<span
										className={`text-sm font-medium ${
											goal.achieved ? "text-green-700" : "text-gray-500"
										}`}
									>
										{goal.actualValue}/{goal.targetValue}
										{goal.unit}
									</span>
								</div>

								{/* プログレスバー */}
								<div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
									<div
										className={`h-full rounded-full transition-all ${
											goal.achieved ? "bg-green-500" : "bg-blue-500"
										}`}
										style={{
											width: `${Math.min((goal.actualValue / goal.targetValue) * 100, 100)}%`,
										}}
									/>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
