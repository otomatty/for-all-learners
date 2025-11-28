/**
 * Milestones Service
 * Server-side service functions for milestones operations
 * Extracted from hooks/milestones/useMilestones.ts
 */

import type { MilestoneEntry } from "@/app/(public)/milestones/_components/milestone-timeline";
import { mapRowToEntry } from "@/hooks/milestones/utils";
import { createClient } from "@/lib/supabase/server";

/**
 * Get all milestones from server
 * Extracted from hooks/milestones/useMilestones.ts
 */
export async function getMilestonesServer(): Promise<MilestoneEntry[]> {
	const supabase = await createClient();

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
}
