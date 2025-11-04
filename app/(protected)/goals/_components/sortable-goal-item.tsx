"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { GoalItem } from "./goal-item";

interface StudyGoal {
	id: string;
	title: string;
	description?: string | null;
	deadline?: string | null;
	progress_rate: number;
	status: "not_started" | "in_progress" | "completed";
	created_at: string;
	completed_at?: string | null;
	deckCount: number;
	priority_order?: number;
}

interface SortableGoalItemProps {
	goal: StudyGoal;
}

export function SortableGoalItem({ goal }: SortableGoalItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: goal.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="relative group">
			<div className="flex items-center gap-3">
				{/* ドラッグハンドル */}
				<button
					type="button"
					{...listeners}
					{...attributes}
					className="cursor-grab hover:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none bg-transparent border-0 p-0"
					aria-label="ゴールの順序を変更"
				>
					<GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground" />
				</button>

				{/* 優先順位番号 */}
				{goal.priority_order && goal.priority_order > 0 && (
					<div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
						{goal.priority_order}
					</div>
				)}

				{/* 既存のGoalItemをラップ */}
				<div className="flex-1">
					<GoalItem goal={goal} />
				</div>
			</div>
		</div>
	);
}
