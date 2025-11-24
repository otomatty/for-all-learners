"use client";

import type { UseMutationOptions } from "@tanstack/react-query";
import type {
	UpdateStudyGoalPayload,
	UpdateStudyGoalResult,
} from "./useUpdateStudyGoal";
import { useUpdateStudyGoal } from "./useUpdateStudyGoal";

/**
 * 学習目標を完了状態に設定します。
 * useUpdateStudyGoal のラッパーです。
 */
export function useCompleteStudyGoal() {
	const updateGoal = useUpdateStudyGoal();

	return {
		...updateGoal,
		mutate: (
			goalId: string,
			options?: UseMutationOptions<
				UpdateStudyGoalResult,
				Error,
				UpdateStudyGoalPayload,
				unknown
			>,
		) => {
			updateGoal.mutate(
				{
					goalId,
					status: "completed",
					progressRate: 100,
				},
				options,
			);
		},
		mutateAsync: async (goalId: string) => {
			return updateGoal.mutateAsync({
				goalId,
				status: "completed",
				progressRate: 100,
			});
		},
	};
}
