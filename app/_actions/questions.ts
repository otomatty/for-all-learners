"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export async function getQuestions() {
	const supabase = await createClient();
	const { data, error } = await supabase.from("questions").select("*");
	if (error) throw error;
	return data;
}

export async function getQuestionById(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("questions")
		.select("*")
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function createQuestion(
	question: Omit<Database["public"]["Tables"]["questions"]["Insert"], "id">,
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("questions")
		.insert(question)
		.single();
	if (error) throw error;
	return data;
}

export async function updateQuestion(
	id: string,
	updates: Database["public"]["Tables"]["questions"]["Update"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("questions")
		.update(updates)
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function deleteQuestion(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("questions")
		.delete()
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

/**
 * Fetches all question variations created by a specific user.
 * @param userId - UUID of the user whose questions to fetch
 */
export async function getQuestionsByUser(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("questions")
		.select("*")
		.eq("user_id", userId);
	if (error) throw error;
	return data;
}
