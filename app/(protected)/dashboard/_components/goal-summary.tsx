import type React from "react";
import { AddGoalDialog } from "./add-goal-dialog";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import GoalHeatmap from "./goal-heatmap";
import GoalDecksSection from "./goal-decks-section";
import { QuizSettingsDialog } from "@/components/QuizSettingsDialog";

interface StudyGoal {
	id: string;
	title: string;
	deadline?: string | null;
	progress_rate: number;
}
interface LearningLog {
	answered_at: string | null;
}
interface GoalSummaryProps {
	goals: StudyGoal[];
	logs: LearningLog[];
}

export const GoalSummary: React.FC<GoalSummaryProps> = ({ goals, logs }) => {
	// 目標が未設定のときのエンプティステート表示
	if (goals.length === 0) {
		return (
			<Card className="p-4 text-center space-y-4">
				<p className="text-gray-500">
					まだ学習目標が設定されていません。目標を追加してください。
				</p>
				<AddGoalDialog />
			</Card>
		);
	}
	const now = new Date();
	// 日付ごとの活動回数を集計
	const dateCounts = logs.reduce<Record<string, number>>((acc, log) => {
		const dateKey = log.answered_at
			? new Date(log.answered_at).toISOString().split("T")[0]
			: null;
		if (dateKey) {
			acc[dateKey] = (acc[dateKey] || 0) + 1;
		}
		return acc;
	}, {});
	const heatmapValues = Object.entries(dateCounts).map(([date, count]) => ({
		date,
		count,
	}));
	// 1年分を表示
	const startDate = new Date(now);
	startDate.setFullYear(startDate.getFullYear() - 1);

	return (
		<Card className="p-4">
			{goals.map((goal) => {
				const deadline = goal.deadline ? new Date(goal.deadline) : null;
				const daysLeft = deadline
					? Math.ceil(
							(deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
						)
					: null;
				return (
					<div key={goal.id} className="md:px-8">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
							<h3 className="text-lg font-semibold">{goal.title}</h3>
							{deadline && (
								<span className="text-sm text-gray-500">
									残り {daysLeft} 日
								</span>
							)}
							<QuizSettingsDialog
								goalId={goal.id}
								goalTitle={goal.title}
								triggerText="ランダム学習開始"
							/>
						</div>
						<Progress value={goal.progress_rate} className="mt-2 w-full h-2" />
						<div className="mt-4">
							<GoalHeatmap
								startDate={startDate}
								endDate={now}
								values={heatmapValues}
							/>
							<GoalDecksSection goalId={goal.id} />
						</div>
					</div>
				);
			})}
		</Card>
	);
};
