"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export async function getLearningLogsByUser(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("learning_logs")
		.select("*")
		.eq("user_id", userId);
	if (error) throw error;
	return data;
}

export async function getLearningLogById(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("learning_logs")
		.select("*")
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function createLearningLog(
	log: Omit<Database["public"]["Tables"]["learning_logs"]["Insert"], "id">,
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("learning_logs")
		.insert(log)
		.single();
	if (error) throw error;
	return data;
}

export async function updateLearningLog(
	id: string,
	updates: Database["public"]["Tables"]["learning_logs"]["Update"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("learning_logs")
		.update(updates)
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function deleteLearningLog(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("learning_logs")
		.delete()
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function getReviewCardsByUser(userId: string, limit = 5) {
	const supabase = await createClient();
	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from("learning_logs")
		.select("*, cards(*)")
		.eq("user_id", userId)
		.lte("next_review_at", now)
		.order("next_review_at", { ascending: true })
		.limit(limit);
	if (error) throw error;
	return data;
}

export async function getRecentActivityByUser(userId: string, limit = 5) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("learning_logs")
		.select("*, cards(*)")
		.eq("user_id", userId)
		.order("answered_at", { ascending: false })
		.limit(limit);
	if (error) throw error;
	return data;
}
