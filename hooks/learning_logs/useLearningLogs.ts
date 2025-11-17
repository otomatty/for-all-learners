"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type LearningLog = Database["public"]["Tables"]["learning_logs"]["Row"];

/**
 * ユーザーの学習ログ一覧を取得します。
 */
export function useLearningLogs() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["learning_logs"],
		queryFn: async (): Promise<LearningLog[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Not authenticated");

			const { data, error } = await supabase
				.from("learning_logs")
				.select("*")
				.eq("user_id", user.id);

			if (error) throw error;
			return data ?? [];
		},
	});
}
