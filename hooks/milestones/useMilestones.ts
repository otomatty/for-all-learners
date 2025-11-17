"use client";

import { useQuery } from "@tanstack/react-query";
import type { MilestoneEntry } from "@/app/(public)/milestones/_components/milestone-timeline";
import { createClient } from "@/lib/supabase/client";
import { mapRowToEntry } from "./utils";

/**
 * マイルストーン一覧を取得します。
 */
export function useMilestones() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["milestones"],
		queryFn: async (): Promise<MilestoneEntry[]> => {
			const { data, error } = await supabase
				.from("milestones")
				.select()
				.order("sort_order", { ascending: true })
				.order("created_at", { ascending: false });

			if (error) {
				throw error;
			}

			if (!data) {
				return [];
			}

			return data.map(mapRowToEntry);
		},
	});
}
