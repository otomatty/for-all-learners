"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export async function getNotesByUser(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("notes")
		.select("*")
		.eq("user_id", userId);
	if (error) throw error;
	return data;
}

export async function getNoteById(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("notes")
		.select("*")
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function createNote(
	note: Omit<Database["public"]["Tables"]["notes"]["Insert"], "id">,
) {
	const supabase = await createClient();
	const { data, error } = await supabase.from("notes").insert(note).single();
	if (error) throw error;
	return data;
}

export async function updateNote(
	id: string,
	updates: Database["public"]["Tables"]["notes"]["Update"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("notes")
		.update(updates)
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function deleteNote(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("notes")
		.delete()
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}
