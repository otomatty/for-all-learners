import { AddGoalDialog } from "@/components/goals/add-goal-dialog";
import { Card } from "@/components/ui/card";
import ServerGoalDecksSection from "./GoalDeckSection";
import GoalSummaryClient from "./GoalSummaryClient";

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
	currentGoalIdFromUrl?: string;
	/** デッキIDをキーとした期限切れカード数マップ */
	dueMap: Record<string, number>;
}

export async function GoalSummary({
	goals,
	logs,
	currentGoalIdFromUrl,
	dueMap,
}: GoalSummaryProps) {
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
	// 表示する目標IDを決定: URLパラメータがあればそれを使い、なければ最初の目標
	const goalIdToDisplay =
		currentGoalIdFromUrl && goals.find((g) => g.id === currentGoalIdFromUrl)
			? currentGoalIdFromUrl
			: goals[0].id;

	return (
		<Card className="p-4">
			<GoalSummaryClient
				goals={goals}
				logs={logs}
				initialSelectedGoalId={goalIdToDisplay}
			/>
			<ServerGoalDecksSection
				key={goalIdToDisplay}
				goalId={goalIdToDisplay}
				dueMap={dueMap}
			/>
		</Card>
	);
}
