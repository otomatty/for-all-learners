"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type UpdateGoalsPriorityResult =
	| { success: true }
	| { success: false; error: string };

/**
 * 学習目標の優先順位を一括更新します。
 */
export function useUpdateGoalsPriority() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			goalIds: string[],
		): Promise<UpdateGoalsPriorityResult> => {
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

			try {
				// トランザクション的に一括更新
				for (let i = 0; i < goalIds.length; i++) {
					const { error } = await supabase
						.from("study_goals")
						.update({ priority_order: i + 1 })
						.eq("id", goalIds[i])
						.eq("user_id", user.id); // セキュリティ確保

					if (error) throw error;
				}

				return { success: true };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : "Unknown error",
				};
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["study_goals"] });
		},
	});
}
