/**
 * Page cache preloader
 * Preloads all page titles into cache for faster link resolution
 */

import logger from "../logger";
import { createClient } from "../supabase/client";
import { normalizeTitleToKey, setCachedPageIds } from "./utils";

/**
 * Preload all page titles into cache
 * This should be called when the editor initializes
 * @param userId - Optional user ID to filter pages
 * @returns Number of pages preloaded
 */
export async function preloadPageTitles(userId?: string): Promise<number> {
	try {
		logger.debug({ userId }, "[PageCachePreloader] Starting preload");

		// Validate environment variables before creating client
		const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!url || !key) {
			logger.warn(
				{ hasUrl: !!url, hasKey: !!key },
				"[PageCachePreloader] Missing Supabase environment variables",
			);
			return 0;
		}

		const supabase = createClient();
		let query = supabase
			.from("pages")
			.select("id, title")
			.order("updated_at", { ascending: false });

		// Filter by user if provided
		if (userId) {
			query = query.eq("user_id", userId);
		}

		const { data, error } = await query;

		if (error) {
			logger.error(
				{
					code: error.code,
					message: error.message,
					details: error.details,
				},
				"[PageCachePreloader] Failed to fetch pages",
			);
			return 0;
		}

		if (!data || data.length === 0) {
			logger.debug("[PageCachePreloader] No pages found");
			return 0;
		}

		// Convert to cache entries with normalized keys
		const entries = data.map((page: { id: string; title: string }) => ({
			key: normalizeTitleToKey(page.title),
			pageId: page.id,
		}));

		// Bulk set cache entries
		setCachedPageIds(entries);

		logger.info(
			{ count: entries.length },
			"[PageCachePreloader] Preloaded page titles",
		);

		return entries.length;
	} catch (error) {
		// Extract error details for logging
		const errorMessage =
			error instanceof Error ? error.message : JSON.stringify(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		logger.error(
			{
				errorMessage,
				errorStack,
			},
			"[PageCachePreloader] Unexpected error during preload",
		);
		return 0;
	}
}

/**
 * Add a single page to cache
 * Useful when a new page is created
 * @param pageId - Page ID
 * @param title - Page title
 */
export function addPageToCache(pageId: string, title: string): void {
	const key = normalizeTitleToKey(title);
	setCachedPageIds([{ key, pageId }]);
	logger.debug(
		{ pageId, title, key },
		"[PageCachePreloader] Added page to cache",
	);
}
