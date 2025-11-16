"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type StudyGoal = Database["public"]["Tables"]["study_goals"]["Row"];

export type UpdateStudyGoalResult =
	| { success: true; data: StudyGoal }
	| { success: false; error: string };

export type UpdateStudyGoalPayload = {
	goalId: string;
	title?: string;
	description?: string;
	deadline?: string;
	status?: "not_started" | "in_progress" | "completed";
	progressRate?: number;
};

/**
 * 学習目標を更新します。
 */
export function useUpdateStudyGoal() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			payload: UpdateStudyGoalPayload,
		): Promise<UpdateStudyGoalResult> => {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();

			if (authError || !user) {
				return {
					success: false,
					error: authError?.message ?? "Not authenticated",
				};
			}

			// 更新データを構築
			const updateData: Database["public"]["Tables"]["study_goals"]["Update"] =
				{};
			if (payload.title !== undefined) updateData.title = payload.title;
			if (payload.description !== undefined)
				updateData.description = payload.description;
			if (payload.deadline !== undefined)
				updateData.deadline =
					payload.deadline?.trim() === "" ? null : payload.deadline;
			if (payload.status !== undefined) updateData.status = payload.status;
			if (payload.progressRate !== undefined) {
				updateData.progress_rate = Math.max(
					0,
					Math.min(100, payload.progressRate),
				);
				if (updateData.progress_rate === 100 && payload.status === undefined) {
					updateData.status = "completed";
					updateData.completed_at = new Date().toISOString();
				}
			}
			updateData.updated_at = new Date().toISOString();

			const { data, error } = await supabase
				.from("study_goals")
				.update(updateData)
				.eq("id", payload.goalId)
				.eq("user_id", user.id)
				.select()
				.single();

			if (error || !data) {
				return {
					success: false,
					error: error?.message || "Failed to update study goal",
				};
			}

			return { success: true, data };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["study_goals"] });
		},
	});
}
