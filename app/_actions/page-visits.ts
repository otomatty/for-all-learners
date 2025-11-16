"use server";

import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Record a page visit for a user
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/notes/[slug]/[id]/page.tsx
 *
 * Dependencies (External files that this file imports/uses):
 *   ├─ lib/supabase/server.ts
 *   ├─ lib/logger.ts
 *   └─ types/database.types.ts
 *
 * Related Documentation:
 *   ├─ Issue: https://github.com/otomatty/for-all-learners/issues/139
 *   └─ Plan: docs/03_plans/telomere-feature/
 *
 * @param pageId - The ID of the page being visited
 * @returns The last visited timestamp, or null if there was an error
 */
export async function recordPageVisit(pageId: string): Promise<Date | null> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		logger.error(
			{ authError, pageId },
			"Failed to get user for page visit recording",
		);
		return null;
	}

	const now = new Date();

	// Upsert the page visit record
	const { data, error } = await supabase
		.from("user_page_visits")
		.upsert(
			{
				user_id: user.id,
				page_id: pageId,
				last_visited_at: now.toISOString(),
			},
			{
				onConflict: "user_id,page_id",
			},
		)
		.select("last_visited_at")
		.single();

	if (error) {
		logger.error(
			{ error, pageId, userId: user.id },
			"Failed to record page visit",
		);
		return null;
	}

	return data?.last_visited_at ? new Date(data.last_visited_at) : now;
}

/**
 * Get the last visit timestamp for a page
 *
 * @param pageId - The ID of the page
 * @returns The last visited timestamp, or null if never visited
 */
export async function getLastPageVisit(pageId: string): Promise<Date | null> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		logger.error(
			{ authError, pageId },
			"Failed to get user for last page visit retrieval",
		);
		return null;
	}

	const { data, error } = await supabase
		.from("user_page_visits")
		.select("last_visited_at")
		.eq("user_id", user.id)
		.eq("page_id", pageId)
		.single();

	if (error || !data) {
		// Note: error might be expected if page was never visited, so log at debug level
		if (error) {
			logger.debug(
				{ error, pageId, userId: user.id },
				"Page visit record not found (may be expected for first visit)",
			);
		}
		return null;
	}

	return data.last_visited_at ? new Date(data.last_visited_at) : null;
}
