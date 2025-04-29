"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export async function getCardsByDeck(deckId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.select("*")
		.eq("deck_id", deckId);
	if (error) throw error;
	return data;
}

export async function getCardById(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.select("*")
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function createCard(
	card: Omit<Database["public"]["Tables"]["cards"]["Insert"], "id">,
) {
	const supabase = await createClient();
	const { data, error } = await supabase.from("cards").insert(card).single();
	if (error) throw error;
	return data;
}

export async function updateCard(
	id: string,
	updates: Database["public"]["Tables"]["cards"]["Update"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.update(updates)
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function deleteCard(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.delete()
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function getCardsByUser(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.select("id")
		.eq("user_id", userId);
	if (error) throw error;
	return data;
}
