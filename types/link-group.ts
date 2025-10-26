/**
 * Link Group Types
 * Database types for link_groups and link_occurrences tables
 */

/**
 * Link Group from database (link_groups table)
 */
export interface LinkGroup {
	id: string;
	key: string; // Normalized link text
	raw_text: string; // Original link text
	page_id: string | null; // Target page ID (if exists)
	link_count: number; // Number of links in this group
	created_at: string;
	updated_at: string;
}

/**
 * Link Occurrence from database (link_occurrences table)
 */
export interface LinkOccurrence {
	id: string;
	link_group_id: string;
	source_page_id: string;
	position: number | null;
	mark_id: string;
	created_at: string;
}

/**
 * Link Group with occurrences (for API response)
 */
export interface LinkGroupWithOccurrences extends LinkGroup {
	occurrences: Array<{
		pageId: string;
		pageTitle: string;
		updatedAt: string;
	}>;
}

/**
 * Request body for creating/updating link group
 */
export interface CreateLinkGroupRequest {
	key: string;
	rawText: string;
	pageId?: string | null;
}

/**
 * Request body for updating link group
 */
export interface UpdateLinkGroupRequest {
	pageId?: string | null;
	rawText?: string;
}

/**
 * Request body for creating link occurrence
 */
export interface CreateLinkOccurrenceRequest {
	linkGroupId: string;
	sourcePageId: string;
	markId: string;
	position?: number | null;
}
