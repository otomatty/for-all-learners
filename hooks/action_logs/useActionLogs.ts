"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook for creating action logs
 * Records user action durations in action_logs table
 */
export function useCreateActionLog() {
	const supabase = createClient();

	return useMutation({
		mutationFn: async ({
			actionType,
			duration,
		}: {
			actionType: "audio" | "ocr" | "learn" | "memo";
			duration: number;
		}) => {
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
		},
	});
}

/**
 * Hook for recording learning session duration
 * Convenience wrapper around useCreateActionLog for "learn" action type
 */
export function useRecordLearningTime() {
	const supabase = createClient();

	return useMutation({
		mutationFn: async (duration: number) => {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				throw new Error(authError?.message || "Not authenticated");
			}

			const { error } = await supabase.from("action_logs").insert({
				user_id: user.id,
				action_type: "learn",
				duration,
			});

			if (error) {
				throw error;
			}
		},
	});
}
