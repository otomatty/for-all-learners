"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateSM2 } from "@/lib/utils/sm2";
import type { Database } from "@/types/database.types";

/**
 * カードの復習結果に基づき、SM-2アルゴリズムを適用してカードと学習ログを更新します
 * @param cardId レビュー対象のカードID
 * @param quality 演習評価（0〜5）
 * @param practiceMode 演習モード（デフォルト: "review"）
 * @returns 計算された次回インターバルと次回レビュー日時、そして作成された学習ログ
 */
export async function reviewCard(
	cardId: string,
	quality: number,
	practiceMode: Database["public"]["Tables"]["learning_logs"]["Insert"]["practice_mode"] = "review",
) {
	const supabase = await createClient();

	// 1. カードの現在の進捗を取得
	const { data: card, error: fetchError } = await supabase
		.from("cards")
		.select("review_interval, ease_factor, repetition_count, user_id")
		.eq("id", cardId)
		.single();
	if (fetchError || !card) {
		throw new Error(fetchError?.message || "カードが見つかりません");
	}

	const prevInterval = card.review_interval ?? 0;
	const prevEF = card.ease_factor ?? 2.5;
	const prevRepCount = card.repetition_count ?? 0;

	// 2. SM-2アルゴリズムで新しい進捗を計算
	const { interval, ef, repetitionCount } = calculateSM2(
		prevInterval,
		prevEF,
		prevRepCount,
		quality,
	);

	// 次回レビュー日時を計算
	const nextReview = new Date();
	nextReview.setDate(nextReview.getDate() + interval);
	const nextReviewAt = nextReview.toISOString();

	// 3. cardsテーブルの更新
	const { error: updateError } = await supabase
		.from("cards")
		.update({
			review_interval: interval,
			ease_factor: ef,
			repetition_count: repetitionCount,
			next_review_at: nextReviewAt,
		})
		.eq("id", cardId);
	if (updateError) {
		throw updateError;
	}

	// 4. learning_logsへの記録
	const { data: insertedLog, error: logError } = await supabase
		.from("learning_logs")
		.insert({
			user_id: card.user_id,
			card_id: cardId,
			question_id: null,
			answered_at: new Date().toISOString(),
			is_correct: quality >= 3,
			user_answer: null,
			practice_mode: practiceMode,
			review_interval: interval,
			next_review_at: nextReviewAt,
		})
		.select()
		.single();
	if (logError) {
		throw logError;
	}

	return { interval, nextReviewAt, log: insertedLog };
}
