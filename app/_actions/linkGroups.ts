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

		// 4. Build result with target page and referencing pages (OPTIMIZED: Batch queries)
		// Collect all IDs first
		const targetPageIds = linkGroupsData
			.map((g) => g.page_id)
			.filter((id): id is string => id !== null);
		const linkGroupIds = linkGroupsData.map((g) => g.id);

		// 4-1. Batch fetch all target pages (1 query instead of N)
		const allTargetPages =
			targetPageIds.length > 0
				? await supabase
						.from("pages")
						.select("id, title, thumbnail_url, content_tiptap, updated_at")
						.in("id", targetPageIds)
						.then(({ data }) => data || [])
				: [];

		// 4-2. Batch fetch all occurrences (1 query instead of N)
		const allOccurrences = await supabase
			.from("link_occurrences")
			.select("link_group_id, source_page_id")
			.in("link_group_id", linkGroupIds)
			.then(({ data }) => data || []);

		// 4-3. Collect all referencing page IDs and batch fetch (1 query instead of N)
		const allReferencingPageIds = [
			...new Set(
				allOccurrences
					.map((o) => o.source_page_id)
					.filter((id) => id !== pageId && !targetPageIds.includes(id)),
			),
		];

		const allReferencingPages =
			allReferencingPageIds.length > 0
				? await supabase
						.from("pages")
						.select("id, title, thumbnail_url, content_tiptap, updated_at")
						.in("id", allReferencingPageIds)
						.order("updated_at", { ascending: false })
						.then(({ data }) => data || [])
				: [];

		// 4-4. Build lookup maps for O(1) access
		const targetPagesMap = new Map(allTargetPages.map((p) => [p.id, p]));
		const occurrencesByGroupId = new Map<string, typeof allOccurrences>();
		for (const occ of allOccurrences) {
			if (!occurrencesByGroupId.has(occ.link_group_id)) {
				occurrencesByGroupId.set(occ.link_group_id, []);
			}
			occurrencesByGroupId.get(occ.link_group_id)?.push(occ);
		}
		const referencingPagesMap = new Map(
			allReferencingPages.map((p) => [p.id, p]),
		);

		// 4-5. Build result using maps (O(n) instead of O(n²))
		const result: LinkGroupForUI[] = linkGroupsData.map((group) => {
			const targetPage = group.page_id
				? targetPagesMap.get(group.page_id)
				: null;

			const occurrences = occurrencesByGroupId.get(group.id) || [];
			const referencingPageIds = [
				...new Set(
					occurrences
						.map((o) => o.source_page_id)
						.filter((id) => id !== pageId && id !== group.page_id),
				),
			];

			const referencingPages = referencingPageIds
				.map((id) => referencingPagesMap.get(id))
				.filter((p): p is NonNullable<typeof p> => p !== undefined);

			return {
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
			};
		});
		return { data: result, error: null };
	} catch (error) {
		logger.error({ pageId, error }, "Failed to get link groups for page");
		return { data: [], error: "Failed to get link groups for page" };
	}
}
