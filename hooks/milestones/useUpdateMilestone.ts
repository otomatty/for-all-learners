"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MilestoneEntry } from "@/app/(public)/milestones/_components/milestone-timeline";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { mapRowToEntry } from "./utils";

type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];
type MilestoneUpdate = Database["public"]["Tables"]["milestones"]["Update"];

/**
 * マイルストーンを更新します。
 */
export function useUpdateMilestone() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: {
			id: string;
			updates: MilestoneUpdate;
		}): Promise<MilestoneEntry> => {
			const { data, error } = await supabase
				.from("milestones")
				.update(payload.updates)
				.eq("id", payload.id)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to update milestone: ${error.message}`);
			}

			if (!data) {
				throw new Error(
					"Failed to update milestone: No data returned from Supabase.",
				);
			}

			return mapRowToEntry(data as MilestoneRow);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["milestones"] });
		},
	});
}
