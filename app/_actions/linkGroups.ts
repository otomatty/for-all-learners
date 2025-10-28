"use server";

/**
 * Link Groups Server Actions
 * Server actions for link group operations
 */

import logger from "@/lib/logger";
import {
	deleteLinkOccurrencesByPage,
	getLinkGroupByKey,
	getLinkGroupInfoByKeys,
	getLinkGroupWithOccurrences,
	getPagesByLinkKey,
	updateLinkGroup,
	upsertLinkGroup,
	upsertLinkOccurrence,
} from "@/lib/services/linkGroupService";
import { createClient } from "@/lib/supabase/server";
import { extractLinksFromContent } from "@/lib/utils/extractLinksFromContent";
import type {
	CreateLinkGroupRequest,
	CreateLinkOccurrenceRequest,
	LinkGroupForUI,
	UpdateLinkGroupRequest,
} from "@/types/link-group";

/**
 * Get link group by key
 */
export async function getLinkGroup(key: string) {
	try {
		const supabase = await createClient();
		const linkGroup = await getLinkGroupByKey(supabase, key);
		return { data: linkGroup, error: null };
	} catch (error) {
		logger.error({ key, error }, "Failed to get link group");
		return { data: null, error: "Failed to get link group" };
	}
}

/**
 * Get link group with occurrences (pages that use this link)
 */
export async function getLinkGroupDetails(key: string) {
	try {
		const supabase = await createClient();
		const linkGroup = await getLinkGroupWithOccurrences(supabase, key);
		return { data: linkGroup, error: null };
	} catch (error) {
		logger.error({ key, error }, "Failed to get link group details");
		return { data: null, error: "Failed to get link group details" };
	}
}

/**
 * Create or update link group
 */
export async function createOrUpdateLinkGroup(request: CreateLinkGroupRequest) {
	try {
		const supabase = await createClient();
		const linkGroup = await upsertLinkGroup(supabase, request);
		return { data: linkGroup, error: null };
	} catch (error) {
		logger.error({ request, error }, "Failed to create/update link group");
		return { data: null, error: "Failed to create/update link group" };
	}
}

/**
 * Update link group (for updating page_id when page is created)
 */
export async function updateLinkGroupPageId(
	key: string,
	request: UpdateLinkGroupRequest,
) {
	try {
		const supabase = await createClient();
		const linkGroup = await updateLinkGroup(supabase, key, request);
		return { data: linkGroup, error: null };
	} catch (error) {
		logger.error({ key, request, error }, "Failed to update link group");
		return { data: null, error: "Failed to update link group" };
	}
}

/**
 * Create or update link occurrence
 */
export async function createOrUpdateLinkOccurrence(
	request: CreateLinkOccurrenceRequest,
) {
	try {
		const supabase = await createClient();
		const occurrence = await upsertLinkOccurrence(supabase, request);
		return { data: occurrence, error: null };
	} catch (error) {
		logger.error({ request, error }, "Failed to create/update link occurrence");
		return { data: null, error: "Failed to create/update link occurrence" };
	}
}

/**
 * Delete all link occurrences for a page
 * Used when page is deleted or content is updated
 */
export async function deleteLinkOccurrencesForPage(sourcePageId: string) {
	try {
		const supabase = await createClient();
		await deleteLinkOccurrencesByPage(supabase, sourcePageId);
		return { error: null };
	} catch (error) {
		logger.error({ sourcePageId, error }, "Failed to delete link occurrences");
		return { error: "Failed to delete link occurrences" };
	}
}

/**
 * Get pages that use the same link text (for grouped links modal)
 */
export async function getPagesUsingLinkText(key: string) {
	try {
		const supabase = await createClient();
		const pages = await getPagesByLinkKey(supabase, key);
		return { data: pages, error: null };
	} catch (error) {
		logger.error({ key, error }, "Failed to get pages by link key");
		return { data: null, error: "Failed to get pages by link key" };
	}
}

/**
 * Get link group information for multiple keys
 * Used to enrich UnifiedLinkMark attributes with link group state
 */
export async function getLinkGroupInfo(keys: string[]) {
	try {
		const supabase = await createClient();
		const infoMap = await getLinkGroupInfoByKeys(supabase, keys);

		// Convert Map to plain object for serialization
		const result: Record<
			string,
			{
				pageId: string | null;
				linkCount: number;
				linkGroupId: string;
			}
		> = {};

		for (const [key, info] of infoMap.entries()) {
			result[key] = info;
		}

		return { data: result, error: null };
	} catch (error) {
		logger.error({ keys, error }, "Failed to get link group info");
		return { data: null, error: "Failed to get link group info" };
	}
}

/**
 * Get link groups for page (UI display)
 * Returns groups where linkCount > 1 with target page and referencing pages
 */
export async function getLinkGroupsForPage(pageId: string): Promise<{
	data: LinkGroupForUI[];
	error: string | null;
}> {
	try {
		const supabase = await createClient();

		// 1. Get current page content
		const { data: page, error: pageError } = await supabase
			.from("pages")
			.select("content_tiptap")
			.eq("id", pageId)
			.single();

		if (pageError || !page) {
			logger.error(
				{ pageId, pageError },
				"Failed to get page for link extraction",
			);
			return { data: [], error: "Failed to get page content" };
		}

		// 2. Extract links from content
		const links = extractLinksFromContent(
			page.content_tiptap as Record<string, unknown>,
		);
		if (links.length === 0) {
			return { data: [], error: null };
		}

		// 3. Get link groups for extracted keys (only linkCount > 1)
		const keys = [...new Set(links.map((l) => l.key))];
		const { data: linkGroupsData, error: groupsError } = await supabase
			.from("link_groups")
			.select("id, key, raw_text, page_id, link_count")
			.in("key", keys)
			.gt("link_count", 1);

		if (groupsError) {
			logger.error({ keys, groupsError }, "Failed to get link groups");
			return { data: [], error: "Failed to get link groups" };
		}

		if (!linkGroupsData || linkGroupsData.length === 0) {
			return { data: [], error: null };
		}

		// 4. Build result with target page and referencing pages
		const result: LinkGroupForUI[] = [];

		for (const group of linkGroupsData) {
			// 4-1. Get target page if exists
			let targetPage = null;
			if (group.page_id) {
				const { data: targetPageData } = await supabase
					.from("pages")
					.select("id, title, thumbnail_url, content_tiptap, updated_at")
					.eq("id", group.page_id)
					.single();

				if (targetPageData) {
					targetPage = targetPageData;
				}
			}

			// 4-2. Get referencing pages
			const { data: occurrences } = await supabase
				.from("link_occurrences")
				.select("source_page_id")
				.eq("link_group_id", group.id);

			const referencingPageIds = [
				...new Set(
					(occurrences || [])
						.map((o) => o.source_page_id)
						.filter((id) => id !== pageId && id !== group.page_id),
				),
			];

			const referencingPages = [];
			if (referencingPageIds.length > 0) {
				const { data: pagesData } = await supabase
					.from("pages")
					.select("id, title, thumbnail_url, content_tiptap, updated_at")
					.in("id", referencingPageIds)
					.order("updated_at", { ascending: false });

				if (pagesData) {
					referencingPages.push(...pagesData);
				}
			}

			result.push({
				key: group.key,
				displayText: group.raw_text,
				linkGroupId: group.id,
				pageId: group.page_id,
				linkCount: group.link_count ?? 0,
				targetPage: targetPage
					? {
							...targetPage,
							content_tiptap: targetPage.content_tiptap as Record<
								string,
								unknown
							>,
							updated_at: targetPage.updated_at ?? "",
						}
					: null,
				referencingPages: referencingPages.map((p) => ({
					...p,
					content_tiptap: p.content_tiptap as Record<string, unknown>,
					updated_at: p.updated_at ?? "",
				})),
			});
		}

		return { data: result, error: null };
	} catch (error) {
		logger.error({ pageId, error }, "Failed to get link groups for page");
		return { data: [], error: "Failed to get link groups for page" };
	}
}
