"use server";

/**
 * Sync Link Groups when page is saved
 * Extracts links from page content and updates link_groups and link_occurrences tables
 */

import type { JSONContent } from "@tiptap/core";
import logger from "@/lib/logger";
import {
	deleteLinkOccurrencesByPage,
	upsertLinkGroup,
	upsertLinkOccurrence,
} from "@/lib/services/linkGroupService";
import { createClient } from "@/lib/supabase/server";
import { extractLinksFromContent } from "@/lib/utils/extractLinksFromContent";

/**
 * Sync link groups for a page
 * Called when page is created or updated
 *
 * @param pageId - Page ID
 * @param contentTiptap - TipTap content JSON
 */
export async function syncLinkGroupsForPage(
	pageId: string,
	contentTiptap: JSONContent,
): Promise<{ success: boolean; error?: string }> {
	try {
		const supabase = await createClient();

		// Extract all links from content
		const links = extractLinksFromContent(contentTiptap);

		logger.debug(
			{ pageId, linkCount: links.length, links: links.slice(0, 3) },
			"[SYNC] Syncing link groups for page",
		);

		// Delete existing occurrences for this page
		await deleteLinkOccurrencesByPage(supabase, pageId);

		// Process each link
		for (const link of links) {
			logger.debug(
				{ pageId, linkKey: link.key, linkText: link.text },
				"[SYNC] Processing link",
			);

			// 1. Upsert link group
			const linkGroup = await upsertLinkGroup(supabase, {
				key: link.key,
				rawText: link.text,
				pageId: link.pageId,
			});

			logger.debug(
				{ linkGroupId: linkGroup.id, linkKey: link.key },
				"[SYNC] Link group upserted",
			);

			// 2. Create link occurrence
			await upsertLinkOccurrence(supabase, {
				linkGroupId: linkGroup.id,
				sourcePageId: pageId,
				markId: link.markId,
				position: link.position,
			});

			logger.debug(
				{ linkGroupId: linkGroup.id, sourcePageId: pageId },
				"[SYNC] Link occurrence created",
			);
		}

		logger.debug(
			{ pageId, linkCount: links.length },
			"[SYNC] Link groups synced successfully",
		);

		return { success: true };
	} catch (error) {
		logger.error({ pageId, error }, "[SYNC] Failed to sync link groups");
		return {
			success: false,
			error: "Failed to sync link groups",
		};
	}
}

/**
 * Delete link groups for a page
 * Called when page is deleted
 *
 * @param pageId - Page ID
 */
export async function deleteLinkGroupsForPage(
	pageId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const supabase = await createClient();

		logger.debug({ pageId }, "Deleting link groups for page");

		// Delete all occurrences for this page
		// The trigger will automatically update link_count in link_groups
		await deleteLinkOccurrencesByPage(supabase, pageId);

		logger.debug({ pageId }, "Link groups deleted");

		return { success: true };
	} catch (error) {
		logger.error({ pageId, error }, "Failed to delete link groups");
		return {
			success: false,
			error: "Failed to delete link groups",
		};
	}
}

/**
 * Update link group page_id when a page is created with matching title
 * This connects all existing grouped links to the newly created page
 *
 * @param pageKey - Normalized page title (key)
 * @param pageId - Newly created page ID
 */
export async function connectLinkGroupToPage(
	pageKey: string,
	pageId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const supabase = await createClient();

		logger.debug({ pageKey, pageId }, "Connecting link group to page");

		// Update link group to point to the new page
		const { error } = await supabase
			.from("link_groups")
			.update({ page_id: pageId })
			.eq("key", pageKey);

		if (error) {
			throw error;
		}

		logger.debug({ pageKey, pageId }, "Link group connected to page");

		return { success: true };
	} catch (error) {
		logger.error({ pageKey, pageId, error }, "Failed to connect link group");
		return {
			success: false,
			error: "Failed to connect link group",
		};
	}
}
