import type { MilestoneEntry } from "@/app/(public)/milestones/_components/milestone-timeline";
import type { Database } from "@/types/database.types";

type MilestoneRow = Database["public"]["Tables"]["milestones"]["Row"];

/**
 * MilestoneRowをMilestoneEntry型にマッピングするヘルパー関数
 */
export function mapRowToEntry(item: MilestoneRow): MilestoneEntry {
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

