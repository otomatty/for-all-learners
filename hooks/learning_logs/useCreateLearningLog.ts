"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { calculateFSRS } from "@/lib/utils/fsrs";
import type { Database } from "@/types/database.types";

export type LearningLog = Database["public"]["Tables"]["learning_logs"]["Row"];

export type CreateLearningLogPayload = Omit<
	Database["public"]["Tables"]["learning_logs"]["Insert"],
	"id" | "user_id" | "review_interval" | "next_review_at"
> & { quality: number };

/**
 * 学習ログを作成します。
 * FSRS計算を含み、カードの進捗も更新します。
 */
export function useCreateLearningLog() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			payload: CreateLearningLogPayload,
		): Promise<LearningLog> => {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				throw new Error(authError?.message || "Not authenticated");
			}

			// 入力値を log から取得し、quality は別引数を使用
			const { card_id, quality } = payload;

			// 1. FSRS計算
			// 前回の安定性・難易度・最終レビュー日時を取得
			const { data: cardSettings, error: settingsError } = await supabase
				.from("cards")
				.select("stability, difficulty, last_reviewed_at")
				.eq("id", card_id)
				.single();

			if (settingsError || !cardSettings) {
				throw new Error(
					settingsError?.message || "カード設定の取得に失敗しました",
				);
			}

			const prevStability = cardSettings.stability ?? 0;
			const prevDifficulty = cardSettings.difficulty ?? 1.0;
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
					question_id: payload.question_id,
					answered_at: now.toISOString(),
					is_correct: quality >= 3,
					user_answer: payload.user_answer ?? null,
					practice_mode: payload.practice_mode,
					quality,
					review_interval: Math.ceil(intervalDays),
					next_review_at: nextReviewAt,
					response_time: payload.response_time ?? 0,
					effort_time: payload.effort_time ?? 0,
					attempt_count: payload.attempt_count ?? 1,
				})
				.select()
				.single();

			if (insertError) throw insertError;
			if (!inserted) throw new Error("Failed to create learning log");

			return inserted;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["learning_logs"] });
			queryClient.invalidateQueries({ queryKey: ["cards"] });
		},
	});
}
