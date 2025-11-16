"use client";

import { useQuery } from "@tanstack/react-query";
import type { MilestoneEntry } from "@/app/(public)/milestones/_components/milestone-timeline";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];

// MilestoneRowをMilestoneEntry型にマッピングするヘルパー関数
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
				return []; // エラー時は空配列を返す
			}

			if (!data) {
				return [];
			}

			return data.map(mapRowToEntry);
		},
	});
}
