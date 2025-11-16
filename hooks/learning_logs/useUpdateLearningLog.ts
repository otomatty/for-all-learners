"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type LearningLog = Database["public"]["Tables"]["learning_logs"]["Row"];

export type UpdateLearningLogPayload = {
	id: string;
	updates: Database["public"]["Tables"]["learning_logs"]["Update"];
};

/**
 * 学習ログを更新します。
 */
export function useUpdateLearningLog() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			payload: UpdateLearningLogPayload,
		): Promise<LearningLog> => {
			const { data, error } = await supabase
				.from("learning_logs")
				.update(payload.updates)
				.eq("id", payload.id)
				.select()
				.single();

			if (error) throw error;
			if (!data) throw new Error("Learning log not found");
			return data;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["learning_logs"] });
			queryClient.invalidateQueries({ queryKey: ["learning_logs", data.id] });
		},
	});
}
