/**
 * Study Goals Service
 * Server-side service functions for study goals operations
 * Extracted from hooks/study_goals/useStudyGoals.ts and useGoalLimits.ts
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type StudyGoal = Database["public"]["Tables"]["study_goals"]["Row"];

export type GoalLimits = {
	currentCount: number;
	maxGoals: number;
	canAddMore: boolean;
	isPaid: boolean;
	remainingGoals: number;
};

/**
 * Get user's study goals from server
 * Extracted from hooks/study_goals/useStudyGoals.ts
 */
export async function getStudyGoalsServer(
	userId: string,
): Promise<StudyGoal[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("study_goals")
		.select("*")
		.eq("user_id", userId)
		.order("priority_order", { ascending: true })
		.order("created_at", { ascending: false });

	if (error) throw error;
	return data ?? [];
}

/**
 * Get user's goal limits from server
 * Extracted from hooks/study_goals/useGoalLimits.ts
 */
export async function getGoalLimitsServer(userId: string): Promise<GoalLimits> {
	const supabase = await createClient();

	// Get current goals count
	const { data: currentGoals, error: goalsError } = await supabase
		.from("study_goals")
		.select("*")
		.eq("user_id", userId)
		.order("priority_order", { ascending: true })
		.order("created_at", { ascending: false });

	if (goalsError) throw goalsError;

	// Check if user has paid subscription
	const { data: subscription } = await supabase
		.from("subscriptions")
		.select("plan_id")
		.eq("user_id", userId)
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
}

/**
 * Get study goals by user ID (for admin users page)
 * Similar to getStudyGoalsServer but accepts any user ID
 */
export async function getStudyGoalsByUserServer(
	userId: string,
): Promise<StudyGoal[]> {
	const supabase = await createClient();

	const { data, error } = await supabase
		.from("study_goals")
		.select("*")
		.eq("user_id", userId)
		.order("priority_order", { ascending: true })
		.order("created_at", { ascending: false });

	if (error) throw error;
	return data ?? [];
}
