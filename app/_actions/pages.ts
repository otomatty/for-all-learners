"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

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

export async function createPage(
	page: Omit<Database["public"]["Tables"]["pages"]["Insert"], "id">,
) {
	const supabase = await createClient();
	const { data, error } = await supabase.from("pages").insert(page).single();
	if (error) throw error;
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
