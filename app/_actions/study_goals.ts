"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
export async function getStudyGoalsByUser(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("study_goals")
		.select("*")
		.eq("user_id", userId);
	if (error) {
		throw error;
	}
	return data;
}

// 成功 or エラー情報を返す型
export type AddStudyGoalResult =
	| { success: true; data: Database["public"]["Tables"]["study_goals"]["Row"] }
	| { success: false; error: string };

export async function addStudyGoal({
	title,
	description,
	deadline,
}: {
	title: string;
	description?: string;
	deadline?: string;
}): Promise<AddStudyGoalResult> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return { success: false, error: authError?.message ?? "Not authenticated" };
	}

	const { data, error } = await supabase
		.from("study_goals")
		.insert({
			user_id: user.id,
			title,
			description,
			deadline,
			progress_rate: 0,
			status: "not_started",
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
}
