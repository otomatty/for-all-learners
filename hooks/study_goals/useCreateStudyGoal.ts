"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type StudyGoal = Database["public"]["Tables"]["study_goals"]["Row"];

export type AddStudyGoalResult =
	| { success: true; data: StudyGoal }
	| { success: false; error: string };

export type CreateStudyGoalPayload = {
	title: string;
	description?: string;
	deadline?: string;
};

/**
 * 学習目標を作成します。
 * 制限チェック（無料: 3個、有料: 10個）を含みます。
 */
export function useCreateStudyGoal() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			payload: CreateStudyGoalPayload,
		): Promise<AddStudyGoalResult> => {
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

			// 現在の目標数を取得して制限をチェック
			const { data: currentGoals, error: goalsError } = await supabase
				.from("study_goals")
				.select("*")
				.eq("user_id", user.id)
				.order("priority_order", { ascending: true })
				.order("created_at", { ascending: false });

			if (goalsError) {
				return { success: false, error: goalsError.message };
			}

			// Check if user has paid subscription
			const { data: subscription } = await supabase
				.from("subscriptions")
				.select("plan_id")
				.eq("user_id", user.id)
				.maybeSingle();

			const isPaid =
				subscription !== null &&
				subscription.plan_id !== "free" &&
				!subscription.plan_id.includes("_free");

			// 制限チェック
			const maxGoals = isPaid ? 10 : 3;
			if ((currentGoals?.length ?? 0) >= maxGoals) {
				const planType = isPaid ? "有料プラン" : "無料プラン";
				return {
					success: false,
					error: `${planType}では最大${maxGoals}個の目標まで設定できます。`,
				};
			}

			// deadline が空文字の場合は null にする
			const sanitizedDeadline =
				payload.deadline?.trim() === "" ? null : payload.deadline;

			// 次の優先順位を取得
			const { count } = await supabase
				.from("study_goals")
				.select("*", { count: "exact", head: true })
				.eq("user_id", user.id);
			const nextPriority = (count ?? 0) + 1;

			const { data, error } = await supabase
				.from("study_goals")
				.insert({
					user_id: user.id,
					title: payload.title,
					description: payload.description,
					deadline: sanitizedDeadline,
					progress_rate: 0,
					status: "in_progress",
					priority_order: nextPriority,
				})
				.select()
				.single();

			if (error || !data) {
				return {
					success: false,
					error: error?.message || "Failed to add study goal",
				};
			}

			return { success: true, data };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["study_goals"] });
		},
	});
}
