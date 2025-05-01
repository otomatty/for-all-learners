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

export async function getPagesByUser(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("pages")
		.select("*")
		.eq("user_id", userId)
		.order("updated_at", { ascending: false });
	if (error) throw error;
	return data;
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
