"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Record a user's action duration in action_logs.
 * @param actionType - one of 'audio','ocr','learn','memo'
 * @param duration - duration in seconds
 */
export async function createActionLog(
	actionType: "audio" | "ocr" | "learn" | "memo",
	duration: number,
): Promise<void> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message || "Not authenticated");
	}

	const { error } = await supabase.from("action_logs").insert({
		user_id: user.id,
		action_type: actionType,
		duration,
	});
	if (error) {
		throw error;
	}
}

/**
 * Record a learning session duration in action_logs.
 * @param duration - duration in seconds
 */
export async function recordLearningTime(duration: number): Promise<void> {
	await createActionLog("learn", duration);
}
