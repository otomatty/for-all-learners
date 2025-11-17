"use client";

import type React from "react";
import { useState } from "react";
import { AddGoalDialog } from "@/components/goals/AddGoalDialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface StudyGoal {
	id: string;
	title: string;
}

interface GoalSelectProps {
	goals: StudyGoal[];
	selectedGoalId: string;
	onGoalChange: (goalId: string) => void;
}

const GoalSelect: React.FC<GoalSelectProps> = ({
	goals,
	selectedGoalId,
	onGoalChange,
}) => {
	const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = useState(false);

	const handleValueChange = (value: string) => {
		if (value === "new-goal") {
			setIsAddGoalDialogOpen(true);
		} else {
			onGoalChange(value);
		}
	};

	return (
		<>
			<Select value={selectedGoalId} onValueChange={handleValueChange}>
				<SelectTrigger className="border rounded w-fit text-lg font-semibold border-border p-4">
					<SelectValue placeholder="学習目標を選択" />
				</SelectTrigger>
				<SelectContent className="text-lg font-semibold border-border">
					{goals.map((goal) => (
						<SelectItem key={goal.id} value={goal.id}>
							<span className="py-2">{goal.title}</span>
						</SelectItem>
					))}
					<SelectItem value="new-goal">
						<span className="py-2">目標を追加する</span>
					</SelectItem>
				</SelectContent>
			</Select>
			<AddGoalDialog
				open={isAddGoalDialogOpen}
				onOpenChange={setIsAddGoalDialogOpen}
			/>
		</>
	);
};

export default GoalSelect;
