/**
 * Link Group Service
 * Service layer for link group operations using Supabase
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
	CreateLinkGroupRequest,
	CreateLinkOccurrenceRequest,
	LinkGroup,
	LinkGroupWithOccurrences,
	LinkOccurrence,
	UpdateLinkGroupRequest,
} from "@/types/link-group";
import logger from "../logger";

/**
 * Get link group by key
 */
export async function getLinkGroupByKey(
	supabase: SupabaseClient,
	key: string,
): Promise<LinkGroup | null> {
	try {
		const { data, error } = await supabase
			.from("link_groups")
			.select("*")
			.eq("key", key)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				// No rows returned
				return null;
			}
			throw error;
		}

		return data;
	} catch (error) {
		logger.error({ key, error }, "Failed to get link group by key");
		throw error;
	}
}

/**
 * Get link group with occurrences
 */
export async function getLinkGroupWithOccurrences(
	supabase: SupabaseClient,
	key: string,
): Promise<LinkGroupWithOccurrences | null> {
	try {
		// Get link group
		const linkGroup = await getLinkGroupByKey(supabase, key);
		if (!linkGroup) {
			return null;
		}

		// Get occurrences with page information
		const { data: occurrences, error: occurrencesError } = await supabase
			.from("link_occurrences")
			.select(
				`
        id,
        source_page_id,
        pages!link_occurrences_source_page_id_fkey (
          id,
          title,
          updated_at
        )
      `,
			)
			.eq("link_group_id", linkGroup.id);

		if (occurrencesError) {
			throw occurrencesError;
		}

		// Transform occurrences to flat structure
		const flatOccurrences = (occurrences || []).map((occurrence) => {
			const page = Array.isArray(occurrence.pages)
				? occurrence.pages[0]
				: occurrence.pages;
			return {
				pageId: occurrence.source_page_id,
				pageTitle: page?.title || "",
				updatedAt: page?.updated_at || "",
			};
		});

		return {
			...linkGroup,
			occurrences: flatOccurrences,
		};
	} catch (error) {
		logger.error({ key, error }, "Failed to get link group with occurrences");
		throw error;
	}
}

/**
 * Create or update link group
 */
export async function upsertLinkGroup(
	supabase: SupabaseClient,
	request: CreateLinkGroupRequest,
): Promise<LinkGroup> {
	try {
		const { data, error } = await supabase
			.from("link_groups")
			.upsert(
				{
					key: request.key,
					raw_text: request.rawText,
					page_id: request.pageId || null,
				},
				{
					onConflict: "key",
				},
			)
			.select()
			.single();

		if (error) {
			throw error;
		}

		return data;
	} catch (error) {
		logger.error({ request, error }, "Failed to upsert link group");
		throw error;
	}
}

/**
 * Update link group
 */
export async function updateLinkGroup(
	supabase: SupabaseClient,
	key: string,
	request: UpdateLinkGroupRequest,
): Promise<LinkGroup> {
	try {
		const updateData: Partial<LinkGroup> = {};
		if (request.pageId !== undefined) {
			updateData.page_id = request.pageId;
		}
		if (request.rawText !== undefined) {
			updateData.raw_text = request.rawText;
		}

		const { data, error } = await supabase
			.from("link_groups")
			.update(updateData)
			.eq("key", key)
			.select()
			.single();

		if (error) {
			throw error;
		}

		return data;
	} catch (error) {
		logger.error({ key, request, error }, "Failed to update link group");
		throw error;
	}
}

/**
 * Create or update link occurrence
 */
export async function upsertLinkOccurrence(
	supabase: SupabaseClient,
	request: CreateLinkOccurrenceRequest,
): Promise<LinkOccurrence> {
	try {
		const { data, error } = await supabase
			.from("link_occurrences")
			.upsert(
				{
					link_group_id: request.linkGroupId,
					source_page_id: request.sourcePageId,
					mark_id: request.markId,
					position: request.position || null,
				},
				{
					onConflict: "source_page_id,mark_id",
				},
			)
			.select()
			.single();

		if (error) {
			throw error;
		}

		return data;
	} catch (error) {
		logger.error({ request, error }, "Failed to upsert link occurrence");
		throw error;
	}
}

/**
 * Delete link occurrences for a page
 * Used when page is deleted or content is updated
 */
export async function deleteLinkOccurrencesByPage(
	supabase: SupabaseClient,
	sourcePageId: string,
): Promise<void> {
	try {
		const { error } = await supabase
			.from("link_occurrences")
			.delete()
			.eq("source_page_id", sourcePageId);

		if (error) {
			throw error;
		}
	} catch (error) {
		logger.error({ sourcePageId, error }, "Failed to delete link occurrences");
		throw error;
	}
}

/**
 * Get pages that use the same link text (for grouped links)
 */
export async function getPagesByLinkKey(
	supabase: SupabaseClient,
	key: string,
): Promise<
	Array<{
		pageId: string;
		title: string;
		updatedAt: string;
		linkCount: number;
	}>
> {
	try {
		// Get link group
		const linkGroup = await getLinkGroupByKey(supabase, key);
		if (!linkGroup) {
			return [];
		}

		// Get occurrences with page information, grouped by page
		const { data, error } = await supabase.rpc("get_pages_by_link_key", {
			p_link_group_id: linkGroup.id,
		});

		if (error) {
			// If function doesn't exist, fallback to manual query
			logger.warn({ error }, "RPC function not found, using fallback query");
			return await getPagesByLinkKeyFallback(supabase, linkGroup.id);
		}

		return data || [];
	} catch (error) {
		logger.error({ key, error }, "Failed to get pages by link key");
		throw error;
	}
}

/**
 * Fallback implementation for getPagesByLinkKey
 */
async function getPagesByLinkKeyFallback(
	supabase: SupabaseClient,
	linkGroupId: string,
): Promise<
	Array<{
		pageId: string;
		title: string;
		updatedAt: string;
		linkCount: number;
	}>
> {
	const { data: occurrences, error } = await supabase
		.from("link_occurrences")
		.select(
			`
      source_page_id,
      pages!link_occurrences_source_page_id_fkey (
        id,
        title,
        updated_at
      )
    `,
		)
		.eq("link_group_id", linkGroupId);

	if (error) {
		throw error;
	}

	// Group by page and count occurrences
	const pageMap = new Map<
		string,
		{
			pageId: string;
			title: string;
			updatedAt: string;
			linkCount: number;
		}
	>();

	for (const occurrence of occurrences || []) {
		const pageId = occurrence.source_page_id;
		const page = Array.isArray(occurrence.pages)
			? occurrence.pages[0]
			: occurrence.pages;

		if (!page) continue;

		if (pageMap.has(pageId)) {
			const existing = pageMap.get(pageId);
			if (existing) {
				existing.linkCount += 1;
			}
		} else {
			pageMap.set(pageId, {
				pageId: page.id,
				title: page.title,
				updatedAt: page.updated_at,
				linkCount: 1,
			});
		}
	}

	return Array.from(pageMap.values());
}

/**
 * Get link group information for multiple keys
 * Used to enrich UnifiedLinkMark attributes with link group state
 *
 * @param supabase - Supabase client
 * @param keys - Array of normalized link keys
 * @returns Map of key to link group info (pageId and linkCount)
 */
export async function getLinkGroupInfoByKeys(
	supabase: SupabaseClient,
	keys: string[],
): Promise<
	Map<
		string,
		{
			pageId: string | null;
			linkCount: number;
			linkGroupId: string;
		}
	>
> {
	try {
		if (keys.length === 0) {
			return new Map();
		}

		const { data, error } = await supabase
			.from("link_groups")
			.select("id, key, page_id, link_count")
			.in("key", keys);

		if (error) {
			throw error;
		}

		const resultMap = new Map<
			string,
			{
				pageId: string | null;
				linkCount: number;
				linkGroupId: string;
			}
		>();

		for (const group of data || []) {
			resultMap.set(group.key, {
				pageId: group.page_id,
				linkCount: group.link_count,
				linkGroupId: group.id,
			});
		}

		return resultMap;
	} catch (error) {
		logger.error({ keys, error }, "Failed to get link group info by keys");
		throw error;
	}
}
