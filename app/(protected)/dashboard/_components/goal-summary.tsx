import type React from "react";
import { Card } from "@/components/ui/card";
import { AddGoalDialog } from "./add-goal-dialog";
import GoalSummaryClient from "./goal-summary-client";
import ServerGoalDecksSection from "./goal-decks-section";

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

export default async function GoalSummary({ goals, logs }: GoalSummaryProps) {
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
	// 初期選択は最初の目標
	const initialGoalId = goals[0].id;

	return (
		<Card className="p-4">
			<GoalSummaryClient goals={goals} logs={logs} />
			<ServerGoalDecksSection goalId={initialGoalId} />
		</Card>
	);
}
