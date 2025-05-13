"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateSM2 } from "@/lib/utils/sm2";
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

/**
 * Record a learning log for a user's answered question.
 */
export async function createLearningLog(
	log: Omit<
		Database["public"]["Tables"]["learning_logs"]["Insert"],
		"id" | "user_id" | "review_interval" | "next_review_at"
	> & { quality: number },
) {
	const supabase = await createClient();
	// Get authenticated user
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message || "Not authenticated");
	}
	// 入力値を log から取得し、quality は別引数を使用
	const { card_id, quality } = log;
	const prevInterval = 0;
	const prevEF = 2.5;
	const prevRep = 0;
	// 1. 計算
	const { interval, ef, repetitionCount } = calculateSM2(
		prevInterval,
		prevEF,
		prevRep,
		quality,
	);
	const nextReviewAt = new Date();
	nextReviewAt.setDate(nextReviewAt.getDate() + interval);
	// 2. カード更新
	await supabase
		.from("cards")
		.update({
			review_interval: interval,
			ease_factor: ef,
			repetition_count: repetitionCount,
			next_review_at: nextReviewAt.toISOString(),
		})
		.eq("id", card_id);
	// 3. learning_logs インサート
	const { data: inserted, error: insertError } = await supabase
		.from("learning_logs")
		.insert({
			user_id: user.id,
			card_id,
			question_id: log.question_id,
			answered_at: new Date().toISOString(),
			is_correct: quality >= 3,
			user_answer: log.user_answer ?? null,
			practice_mode: log.practice_mode,
			review_interval: interval,
			next_review_at: nextReviewAt.toISOString(),
		})
		.single();
	if (insertError) throw insertError;
	return inserted;
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

/**
 * ユーザーが当日レビュー済みのカード数をデッキごとに集計して返します
 * @param userId ユーザーID
 * @returns [{ deck_id, review_count }]
 */
export async function getTodayReviewCountsByDeck(
	userId: string,
): Promise<Array<{ deck_id: string; review_count: number }>> {
	const supabase = await createClient();
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const { data: logs, error } = await supabase
		.from("learning_logs")
		.select("card_id, cards(deck_id)")
		.eq("user_id", userId)
		.gte("answered_at", today.toISOString())
		.lt("answered_at", tomorrow.toISOString());
	if (error) throw error;
	const map = new Map<string, number>();
	for (const log of logs) {
		const deck = (log as { cards: { deck_id: string } }).cards.deck_id;
		map.set(deck, (map.get(deck) ?? 0) + 1);
	}
	return Array.from(map.entries()).map(([deck_id, review_count]) => ({
		deck_id,
		review_count,
	}));
}
