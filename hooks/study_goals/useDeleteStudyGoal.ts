"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type DeleteStudyGoalResult =
	| { success: true }
	| { success: false; error: string };

/**
 * 学習目標を削除します。
 * 関連する goal_deck_links も削除します。
 */
export function useDeleteStudyGoal() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (goalId: string): Promise<DeleteStudyGoalResult> => {
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

			// 関連するgoal_deck_linksも削除
			await supabase.from("goal_deck_links").delete().eq("goal_id", goalId);

			const { error } = await supabase
				.from("study_goals")
				.delete()
				.eq("id", goalId)
				.eq("user_id", user.id);

			if (error) {
				return {
					success: false,
					error: error.message || "Failed to delete study goal",
				};
			}

			return { success: true };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["study_goals"] });
		},
	});
}
