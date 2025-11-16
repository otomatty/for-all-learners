"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type DeleteMilestoneResult = {
	success: boolean;
	error?: string;
};

/**
 * マイルストーンを削除します。
 */
export function useDeleteMilestone() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<DeleteMilestoneResult> => {
			const { error } = await supabase.from("milestones").delete().eq("id", id);

			if (error) {
				return { success: false, error: error.message };
			}

			return { success: true };
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["milestones"] });
		},
	});
}
