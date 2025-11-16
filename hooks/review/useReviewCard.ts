"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { calculateFSRS } from "@/lib/utils/fsrs";
import type { Database } from "@/types/database.types";

export type ReviewCardResult = {
	interval: number;
	nextReviewAt: string;
	log: Database["public"]["Tables"]["learning_logs"]["Row"];
};

export type ReviewCardPayload = {
	cardId: string;
	quality: number;
	practiceMode?: Database["public"]["Tables"]["learning_logs"]["Insert"]["practice_mode"];
};

/**
 * カードの復習結果に基づき、FSRSアルゴリズムを適用してカードと学習ログを更新します
 * @param cardId レビュー対象のカードID
 * @param quality 演習評価（0〜5）
 * @param practiceMode 演習モード（デフォルト: "review"）
 * @returns 計算された次回インターバルと次回レビュー日時、そして作成された学習ログ
 */
export function useReviewCard() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			payload: ReviewCardPayload,
		): Promise<ReviewCardResult> => {
			// 1. カードの現在の進捗を取得
			const { data: card, error: fetchError } = await supabase
				.from("cards")
				.select(
					"review_interval, ease_factor, repetition_count, user_id, stability, difficulty, last_reviewed_at",
				)
				.eq("id", payload.cardId)
				.single();

			if (fetchError || !card) {
				throw new Error(fetchError?.message || "カードが見つかりません");
			}

			const prevStability = card.stability ?? 0;
			const prevDifficulty = card.difficulty ?? 1.0;
			const lastReviewedAt = card.last_reviewed_at;
			const now = new Date();
			const elapsedMs = lastReviewedAt
				? now.getTime() - new Date(lastReviewedAt).getTime()
				: 0;
			const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

			// 2. FSRSアルゴリズムで新しい進捗を計算
			const {
				stability: newStability,
				difficulty: newDifficulty,
				intervalDays,
			} = calculateFSRS(
				prevStability,
				prevDifficulty,
				elapsedDays,
				payload.quality,
			);

			// 次回レビュー日時を計算
			const nextReviewAt = new Date(
				now.getTime() + intervalDays * 24 * 60 * 60 * 1000,
			).toISOString();

			// 3. cardsテーブルの更新
			const { error: updateError } = await supabase
				.from("cards")
				.update({
					review_interval: Math.ceil(intervalDays),
					stability: newStability,
					difficulty: newDifficulty,
					last_reviewed_at: now.toISOString(),
					next_review_at: nextReviewAt,
				})
				.eq("id", payload.cardId);

			if (updateError) {
				throw updateError;
			}

			// 4. learning_logsへの記録
			const { data: insertedLog, error: logError } = await supabase
				.from("learning_logs")
				.insert({
					user_id: card.user_id,
					card_id: payload.cardId,
					question_id: null,
					answered_at: now.toISOString(),
					is_correct: payload.quality >= 3,
					user_answer: null,
					practice_mode: payload.practiceMode ?? "review",
					review_interval: Math.ceil(intervalDays),
					next_review_at: nextReviewAt,
				})
				.select()
				.single();

			if (logError || !insertedLog) {
				throw logError || new Error("Failed to create learning log");
			}

			return {
				interval: Math.ceil(intervalDays),
				nextReviewAt,
				log: insertedLog,
			};
		},
		onSuccess: () => {
			// 関連するクエリを無効化
			queryClient.invalidateQueries({ queryKey: ["cards"] });
			queryClient.invalidateQueries({ queryKey: ["learning_logs"] });
			queryClient.invalidateQueries({ queryKey: ["cards", "due"] });
		},
	});
}
