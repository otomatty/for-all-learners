"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type LearningLog = Database["public"]["Tables"]["learning_logs"]["Row"];

/**
 * 学習ログを削除します。
 */
export function useDeleteLearningLog() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<LearningLog> => {
			const { data, error } = await supabase
				.from("learning_logs")
				.delete()
				.eq("id", id)
				.select()
				.single();

			if (error) throw error;
			if (!data) throw new Error("Learning log not found");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["learning_logs"] });
		},
	});
}
