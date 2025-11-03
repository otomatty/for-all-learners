/**
 * Learning Activity Section Component
 *
 * 詳細パネル内の学習活動セクションを表示するコンポーネント
 */

import { BookOpen, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { ACTIVITY_ICONS } from "./constants";
import type { LearningActivityDetail } from "./types";

interface LearningActivitySectionProps {
	activities: LearningActivityDetail[];
}

export function LearningActivitySection({
	activities,
}: LearningActivitySectionProps) {
	if (activities.length === 0) {
		return (
			<div className="p-4 bg-muted rounded-lg">
				<div className="flex items-center gap-2 text-muted-foreground">
					<BookOpen className="h-5 w-5" />
					<p className="text-sm">この日の学習活動はありません</p>
				</div>
			</div>
		);
	}

	const totalCards = activities.reduce(
		(sum, activity) => sum + activity.reviewedCards + activity.newCards,
		0,
	);
	const totalMinutes = activities.reduce(
		(sum, activity) => sum + activity.timeSpentMinutes,
		0,
	);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold flex items-center gap-2">
					{ACTIVITY_ICONS.card_review} カード学習活動
				</h3>
				<div className="text-sm text-muted-foreground">
					合計 {totalCards}枚 / {totalMinutes}分
				</div>
			</div>

			<div className="space-y-3">
				{activities.map((activity) => (
					<Link
						key={activity.deckId}
						href={`/decks/${activity.deckId}`}
						className="block p-4 bg-background border border-border rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
					>
						<div className="space-y-2">
							{/* デッキ名 */}
							<div className="font-medium text-foreground">
								{activity.deckName}
							</div>

							{/* 統計情報 */}
							<div className="grid grid-cols-2 gap-2 text-sm">
								{/* 復習カード */}
								{activity.reviewedCards > 0 && (
									<div className="flex items-center gap-1 text-foreground">
										<span>{ACTIVITY_ICONS.card_review}</span>
										<span>復習: {activity.reviewedCards}枚</span>
									</div>
								)}

								{/* 新規カード */}
								{activity.newCards > 0 && (
									<div className="flex items-center gap-1 text-foreground">
										<span>{ACTIVITY_ICONS.card_new}</span>
										<span>新規: {activity.newCards}枚</span>
									</div>
								)}

								{/* 正答率 */}
								<div className="flex items-center gap-1">
									{activity.correctRate >= 80 ? (
										<CheckCircle className="h-4 w-4 text-green-600" />
									) : (
										<XCircle className="h-4 w-4 text-orange-600" />
									)}
									<span
										className={
											activity.correctRate >= 80
												? "text-green-700 dark:text-green-400"
												: "text-orange-700 dark:text-orange-400"
										}
									>
										正答率: {activity.correctRate.toFixed(1)}%
									</span>
								</div>

								{/* 学習時間 */}
								<div className="flex items-center gap-1 text-muted-foreground">
									<Clock className="h-4 w-4" />
									<span>{activity.timeSpentMinutes}分</span>
								</div>
							</div>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
