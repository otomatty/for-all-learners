"use client";

import { useUpdateStudyGoal } from "./useUpdateStudyGoal";

export type UpdateStudyGoalResult =
	| { success: true; data: unknown }
	| { success: false; error: string };

/**
 * 学習目標を完了状態に設定します。
 * useUpdateStudyGoal のラッパーです。
 */
export function useCompleteStudyGoal() {
	const updateGoal = useUpdateStudyGoal();

	return {
		...updateGoal,
		mutate: (goalId: string) => {
			updateGoal.mutate({
				goalId,
				status: "completed",
				progressRate: 100,
			});
		},
	};
}
