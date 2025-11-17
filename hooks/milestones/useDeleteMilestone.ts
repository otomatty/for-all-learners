"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * マイルストーンを削除します。
 */
export function useDeleteMilestone() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			const { error } = await supabase.from("milestones").delete().eq("id", id);

			if (error) {
				throw new Error(error.message);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["milestones"] });
		},
	});
}
