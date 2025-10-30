"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Synchronize page_page_links for a given page.
 * Inserts links in outgoingIds and removes any other existing links.
 */
export async function updatePageLinks({
	pageId,
	outgoingIds,
}: {
	pageId: string;
	outgoingIds: string[];
}) {
	const supabase = await createClient();

	// Upsert link records to add missing ones without deleting existing
	if (outgoingIds.length > 0) {
		const { error: upsertErr } = await supabase.from("page_page_links").upsert(
			outgoingIds.map((linked_id) => ({ page_id: pageId, linked_id })),
			{ ignoreDuplicates: true },
		);
		if (upsertErr) {
			throw upsertErr;
		}
	}

	return { success: true };
}
