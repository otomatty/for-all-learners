"use client";

import type React from "react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import GoalHeatmap from "./goal-heatmap";
import { QuizSettingsDialog } from "@/components/quiz-settings-dialog";
import TimeProgress from "./time-progress";
import GoalSelect from "./goal-select";

interface StudyGoal {
	id: string;
	title: string;
	created_at?: string | null;
	deadline?: string | null;
	progress_rate: number;
}
interface LearningLog {
	answered_at: string | null;
}
interface GoalSummaryClientProps {
	goals: StudyGoal[];
	logs: LearningLog[];
}

const GoalSummaryClient: React.FC<GoalSummaryClientProps> = ({
	goals,
	logs,
}) => {
	const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0].id);
	const selectedGoal = goals.find((g) => g.id === selectedGoalId);
	const now = new Date();

	// Extract and narrow time properties
	const createdAt = selectedGoal?.created_at;
	const deadlineVal = selectedGoal?.deadline;

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
	const startDate = new Date(now);
	startDate.setFullYear(startDate.getFullYear() - 1);

	return (
		<div className="mt-4">
			<GoalSelect
				goals={goals}
				selectedGoalId={selectedGoalId}
				onGoalChange={setSelectedGoalId}
			/>
			{createdAt && deadlineVal && (
				<TimeProgress createdAt={createdAt} deadline={deadlineVal} />
			)}

			<div className="mt-4">
				<GoalHeatmap
					startDate={startDate}
					endDate={now}
					values={heatmapValues}
				/>
			</div>
			<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
				<QuizSettingsDialog
					goalId={selectedGoal?.id}
					goalTitle={selectedGoal?.title}
					triggerText="すべてのデッキを学習する"
					disabled={true}
				/>
				<QuizSettingsDialog
					goalId={selectedGoal?.id}
					goalTitle={selectedGoal?.title}
					triggerText="すべてのデッキを復習する"
					reviewMode={true}
					disabled={true}
				/>
			</div>
		</div>
	);
};

export default GoalSummaryClient;
