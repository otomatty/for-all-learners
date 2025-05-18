"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateFSRS } from "@/lib/utils/fsrs";
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
	// 1. FSRS計算
	// 前回の安定性・難易度・最終レビュー日時を取得
	const { data: cardSettings, error: settingsError } = await supabase
		.from("cards")
		.select("stability, difficulty, last_reviewed_at")
		.eq("id", card_id)
		.single();
	if (settingsError || !cardSettings) {
		throw new Error(settingsError?.message || "カード設定の取得に失敗しました");
	}
	const prevStability = cardSettings.stability;
	const prevDifficulty = cardSettings.difficulty;
	const lastReviewedAt = cardSettings.last_reviewed_at;
	const now = new Date();
	const elapsedMs = lastReviewedAt
		? now.getTime() - new Date(lastReviewedAt).getTime()
		: 0;
	const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
	const {
		stability: newStability,
		difficulty: newDifficulty,
		intervalDays,
	} = calculateFSRS(prevStability, prevDifficulty, elapsedDays, quality);
	const nextReviewAt = new Date(
		now.getTime() + intervalDays * 24 * 60 * 60 * 1000,
	).toISOString();
	// 2. カード更新
	await supabase
		.from("cards")
		.update({
			review_interval: Math.ceil(intervalDays),
			stability: newStability,
			difficulty: newDifficulty,
			last_reviewed_at: now.toISOString(),
			next_review_at: nextReviewAt,
		})
		.eq("id", card_id);
	// 3. learning_logs インサート
	const { data: inserted, error: insertError } = await supabase
		.from("learning_logs")
		.insert({
			user_id: user.id,
			card_id,
			question_id: log.question_id,
			answered_at: now.toISOString(),
			is_correct: quality >= 3,
			user_answer: log.user_answer ?? null,
			practice_mode: log.practice_mode,
			quality,
			review_interval: Math.ceil(intervalDays),
			next_review_at: nextReviewAt,
			response_time: log.response_time ?? 0,
			effort_time: log.effort_time ?? 0,
			attempt_count: log.attempt_count ?? 1,
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
