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
		.select("id")
		.eq("user_id", userId);
	if (error) throw error;
	return data;
}
