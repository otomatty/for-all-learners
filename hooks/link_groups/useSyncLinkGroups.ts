"use client";

import { useMutation } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/core";
import logger from "@/lib/logger";
import { deleteLinkOccurrencesByPage } from "@/lib/services/linkGroupService";
import { createClient } from "@/lib/supabase/client";
import { extractLinksFromContent } from "@/lib/utils/extractLinksFromContent";

/**
 * Hook for syncing link groups for a page
 * Called when page is created or updated
 */
export function useSyncLinkGroupsForPage() {
	const supabase = createClient();

	return useMutation({
		mutationFn: async ({
			pageId,
			contentTiptap,
		}: {
			pageId: string;
			contentTiptap: JSONContent;
		}): Promise<{ success: boolean; error?: string }> => {
			try {
				// Extract all links from content
				const links = extractLinksFromContent(contentTiptap);

				logger.debug(
					{ pageId, linkCount: links.length, links: links.slice(0, 3) },
					"[SYNC] Syncing link groups for page",
				);

				// Delete existing occurrences for this page
				await deleteLinkOccurrencesByPage(supabase, pageId);

				if (links.length === 0) {
					logger.debug({ pageId }, "[SYNC] No links to sync");
					return { success: true };
				}

				// Batch upsert link groups
				const linkGroupsToUpsert = links.map((link) => ({
					key: link.key,
					raw_text: link.text,
					page_id: link.pageId || null,
				}));

				const { data: upsertedGroups, error: upsertError } = await supabase
					.from("link_groups")
					.upsert(linkGroupsToUpsert, { onConflict: "key" })
					.select("id, key");

				if (upsertError) {
					throw upsertError;
				}

				// Create a map of key -> id for quick lookup
				const groupIdMap = new Map(
					(upsertedGroups || []).map((g) => [g.key, g.id]),
				);

				logger.debug(
					{
						pageId,
						linkCount: links.length,
						groupCount: upsertedGroups?.length,
					},
					"[SYNC] Link groups upserted",
				);

				// Batch upsert link occurrences
				const occurrencesToUpsert = links
					.map((link) => {
						const linkGroupId = groupIdMap.get(link.key);
						if (!linkGroupId) {
							logger.warn(
								{ pageId, linkKey: link.key },
								"[SYNC] Link group ID not found for key",
							);
							return null;
						}
						return {
							link_group_id: linkGroupId,
							source_page_id: pageId,
							mark_id: link.markId,
							position: link.position ?? null,
						};
					})
					.filter((o): o is NonNullable<typeof o> => o !== null);

				if (occurrencesToUpsert.length > 0) {
					const { error: occurrenceError } = await supabase
						.from("link_occurrences")
						.upsert(occurrencesToUpsert, {
							onConflict: "source_page_id,mark_id",
						});

					if (occurrenceError) {
						throw occurrenceError;
					}

					logger.debug(
						{ pageId, occurrenceCount: occurrencesToUpsert.length },
						"[SYNC] Link occurrences upserted",
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
		},
	});
}

/**
 * Hook for deleting link groups for a page
 * Called when page is deleted
 */
export function useDeleteLinkGroupsForPage() {
	const supabase = createClient();

	return useMutation({
		mutationFn: async (
			pageId: string,
		): Promise<{ success: boolean; error?: string }> => {
			try {
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
		},
	});
}

/**
 * Hook for connecting link group to page
 * Update link group page_id when a page is created with matching title
 * This connects all existing grouped links to the newly created page
 */
export function useConnectLinkGroupToPage() {
	const supabase = createClient();

	return useMutation({
		mutationFn: async ({
			pageKey,
			pageId,
		}: {
			pageKey: string;
			pageId: string;
		}): Promise<{ success: boolean; error?: string }> => {
			try {
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
				logger.error(
					{ pageKey, pageId, error },
					"Failed to connect link group",
				);
				return {
					success: false,
					error: "Failed to connect link group",
				};
			}
		},
	});
}
