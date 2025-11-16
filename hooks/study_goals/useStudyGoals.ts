"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type StudyGoal = Database["public"]["Tables"]["study_goals"]["Row"];

/**
 * ユーザーの学習目標一覧を取得します。
 */
export function useStudyGoals() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["study_goals"],
		queryFn: async (): Promise<StudyGoal[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Not authenticated");

			const { data, error } = await supabase
				.from("study_goals")
				.select("*")
				.eq("user_id", user.id)
				.order("priority_order", { ascending: true })
				.order("created_at", { ascending: false });

			if (error) throw error;
			return data ?? [];
		},
	});
}
