"use server";

/**
 * Link Groups Server Actions
 * Server actions for link group operations
 */

import { createClient } from "@/lib/supabase/server";
import {
	getLinkGroupByKey,
	getLinkGroupWithOccurrences,
	upsertLinkGroup,
	updateLinkGroup,
	upsertLinkOccurrence,
	deleteLinkOccurrencesByPage,
	getPagesByLinkKey,
} from "@/lib/services/linkGroupService";
import type {
	CreateLinkGroupRequest,
	CreateLinkOccurrenceRequest,
	UpdateLinkGroupRequest,
} from "@/types/link-group";
import logger from "@/lib/logger";

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
