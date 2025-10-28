"use server";

import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";
import { normalizeTitleToKey } from "@/lib/unilink/utils";
import { extractFirstImageUrl } from "@/lib/utils/thumbnailExtractor";
import type { Database } from "@/types/database.types";
import {
	connectLinkGroupToPage,
	deleteLinkGroupsForPage,
	syncLinkGroupsForPage,
} from "./syncLinkGroups";

export async function getPagesByNote(noteId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("pages")
		.select("*")
		.eq("note_id", noteId);
	if (error) throw error;
	return data;
}

export async function getPageById(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("pages")
		.select("*")
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

/**
 * ページ作成（自動サムネイル生成付き）
 * @param page 作成するページデータ
 * @param autoGenerateThumbnail サムネイル自動生成の有効/無効（デフォルト: true）
 */
export async function createPage(
	page: Omit<Database["public"]["Tables"]["pages"]["Insert"], "id">,
	autoGenerateThumbnail = true,
) {
	const supabase = await createClient();

	// 自動サムネイル生成が有効で、content_tiptapが存在する場合
	const pageWithThumbnail = { ...page };
	if (autoGenerateThumbnail && page.content_tiptap) {
		const thumbnailUrl = extractFirstImageUrl(
			page.content_tiptap as JSONContent,
		);
		if (thumbnailUrl) {
			pageWithThumbnail.thumbnail_url = thumbnailUrl;
		}
	}

	const { data, error } = await supabase
		.from("pages")
		.insert(pageWithThumbnail)
		.select()
		.single();
	if (error) throw error;

	// 1. Sync link groups for the new page
	if (data.content_tiptap) {
		await syncLinkGroupsForPage(data.id, data.content_tiptap as JSONContent);
	}

	// 2. Connect link groups that match this page title
	// If a link group exists with key matching this page title, update its page_id
	const normalizedKey = normalizeTitleToKey(data.title);
	await connectLinkGroupToPage(normalizedKey, data.id);

	// 3. Auto-link to default note (for /pages consolidation)
	// Import here to avoid circular dependencies
	const { linkPageToDefaultNote } = await import("./notes/getDefaultNote");
	try {
		await linkPageToDefaultNote(data.user_id, data.id);
	} catch {
		// Log but don't fail the page creation
		// The page can still be manually linked later
	}

	return data;
}

export async function updatePage(
	id: string,
	updates: Database["public"]["Tables"]["pages"]["Update"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("pages")
		.update(updates)
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function deletePage(id: string) {
	const supabase = await createClient();

	// Delete link group occurrences for this page
	// Trigger will automatically update link_count on link_groups
	await deleteLinkGroupsForPage(id);

	const { data, error } = await supabase
		.from("pages")
		.delete()
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

/**
 * Fetches pages for a user with pagination and sorting.
 * @param userId User ID to fetch pages for.
 * @param limit Number of items to return (default 100).
 * @param offset Number of items to skip (default 0).
 * @param sortBy Sort key: 'updated' or 'created' (default 'updated').
 * @returns Object containing pages array and totalCount.
 */
export async function getPagesByUser(
	userId: string,
	limit = 100,
	offset = 0,
	sortBy: "updated" | "created" = "updated",
): Promise<{
	pages: Database["public"]["Tables"]["pages"]["Row"][];
	totalCount: number;
}> {
	const supabase = await createClient();
	const sortColumn = sortBy === "updated" ? "updated_at" : "created_at";
	const { data, error, count } = await supabase
		.from("pages")
		.select("*", { count: "exact" })
		.eq("user_id", userId)
		.order(sortColumn, { ascending: false })
		.range(offset, offset + limit - 1);
	if (error) throw error;
	return { pages: data ?? [], totalCount: count ?? 0 };
}

export async function getSharedPagesByUser(userId: string): Promise<
	Array<
		Database["public"]["Tables"]["page_shares"]["Row"] & {
			pages: Database["public"]["Tables"]["pages"]["Row"];
		}
	>
> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("page_shares")
		.select("*, pages(*)")
		.eq("shared_with_user_id", userId)
		.order("pages(updated_at)", { ascending: false });
	if (error) throw error;
	return data;
}
