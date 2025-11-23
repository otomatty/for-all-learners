"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

type ActionLogPayload = {
	actionType: "audio" | "ocr" | "learn" | "memo";
	duration: number;
};

/**
 * Common function for creating action logs
 * Handles authentication and database insertion
 */
async function createActionLog(
	supabase: ReturnType<typeof createClient>,
	{ actionType, duration }: ActionLogPayload,
): Promise<void> {
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
 * Hook for creating action logs
 * Records user action durations in action_logs table
 */
export function useCreateActionLog() {
	const supabase = createClient();

	return useMutation({
		mutationFn: (variables: ActionLogPayload) =>
			createActionLog(supabase, variables),
	});
}

/**
 * Hook for recording learning session duration
 * Convenience wrapper around useCreateActionLog for "learn" action type
 */
export function useRecordLearningTime() {
	const supabase = createClient();

	return useMutation({
		mutationFn: (duration: number) =>
			createActionLog(supabase, { actionType: "learn", duration }),
	});
}
