"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type GoalLimits = {
	currentCount: number;
	maxGoals: number;
	canAddMore: boolean;
	isPaid: boolean;
	remainingGoals: number;
};

/**
 * ユーザーの目標制限情報を取得します。
 */
export function useGoalLimits() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["study_goals", "limits"],
		queryFn: async (): Promise<GoalLimits> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			// ユーザーID検証
			if (!user || userError) {
				return {
					currentCount: 0,
					maxGoals: 3,
					canAddMore: true,
					isPaid: false,
					remainingGoals: 3,
				};
			}

			const { data: currentGoals, error: goalsError } = await supabase
				.from("study_goals")
				.select("*")
				.eq("user_id", user.id)
				.order("priority_order", { ascending: true })
				.order("created_at", { ascending: false });

			if (goalsError) throw goalsError;

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
			const maxGoals = isPaid ? 10 : 3;
			const currentCount = currentGoals?.length ?? 0;
			const canAddMore = currentCount < maxGoals;

			return {
				currentCount,
				maxGoals,
				canAddMore,
				isPaid,
				remainingGoals: maxGoals - currentCount,
			};
		},
	});
}
