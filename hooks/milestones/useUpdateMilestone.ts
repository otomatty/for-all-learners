"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MilestoneEntry } from "@/app/(public)/milestones/_components/milestone-timeline";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];
type MilestoneUpdate = Database["public"]["Tables"]["milestones"]["Update"];

function mapRowToEntry(item: MilestoneRow): MilestoneEntry {
	const status = item.status as MilestoneEntry["status"];
	const relatedLinks = item.related_links as
		| { label: string; url: string }[]
		| null;
	const features = item.features as string[] | null;

	return {
		id: item.id,
		timeframe: item.timeframe,
		title: item.title,
		description: item.description || "",
		status: status,
		progress: item.progress ?? undefined,
		imageUrl: item.image_url ?? undefined,
		features: features ?? undefined,
		relatedLinks: relatedLinks ?? undefined,
		sort_order: item.sort_order,
	};
}

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
		}): Promise<MilestoneEntry | null> => {
			const { data, error } = await supabase
				.from("milestones")
				.update(payload.updates)
				.eq("id", payload.id)
				.select()
				.single();

			if (error) {
				return null;
			}

			if (!data) {
				return null;
			}

			return mapRowToEntry(data as MilestoneRow);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["milestones"] });
		},
	});
}
