"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MilestoneEntry } from "@/app/(public)/milestones/_components/milestone-timeline";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { mapRowToEntry } from "./utils";

type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];
type MilestoneInsert = Database["public"]["Tables"]["milestones"]["Insert"];

/**
 * マイルストーンを作成します。
 */
export function useCreateMilestone() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			milestoneData: MilestoneInsert,
		): Promise<MilestoneEntry> => {
			const { data, error } = await supabase
				.from("milestones")
				.insert(milestoneData)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create milestone: ${error.message}`);
			}

			if (!data) {
				throw new Error(
					"Failed to create milestone: No data returned from Supabase.",
				);
			}

			return mapRowToEntry(data as MilestoneRow);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["milestones"] });
		},
	});
}
