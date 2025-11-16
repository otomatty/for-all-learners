"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type LearningLog = Database["public"]["Tables"]["learning_logs"]["Row"];

/**
 * 学習ログ詳細を取得します。
 */
export function useLearningLog(id: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["learning_logs", id],
		queryFn: async (): Promise<LearningLog> => {
			const { data, error } = await supabase
				.from("learning_logs")
				.select("*")
				.eq("id", id)
				.single();

			if (error) throw error;
			if (!data) throw new Error("Learning log not found");
			return data;
		},
		enabled: !!id,
	});
}
