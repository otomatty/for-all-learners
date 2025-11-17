"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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
 *
 * Phase 2対応: RPC関数 `review_card` を使用してトランザクション管理を実装
 * すべての処理（カード取得、FSRS計算、カード更新、学習ログ作成）が
 * 単一のトランザクション内で実行され、データ整合性が保証されます。
 *
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
			// RPC関数を呼び出してトランザクション内で処理
			const { data, error } = await supabase.rpc("review_card", {
				p_card_id: payload.cardId,
				p_quality: payload.quality,
				p_practice_mode: payload.practiceMode ?? "review",
			});

			if (error) {
				throw new Error(error.message || "カードのレビューに失敗しました");
			}

			if (!data) {
				throw new Error("カードのレビュー結果が取得できませんでした");
			}

			// RPC関数の戻り値はJSON形式なので、型アサーションを使用
			const result = data as ReviewCardResult;
			return result;
		},
		onSuccess: () => {
			// 関連するクエリを無効化
			queryClient.invalidateQueries({ queryKey: ["cards"] });
			queryClient.invalidateQueries({ queryKey: ["learning_logs"] });
			queryClient.invalidateQueries({ queryKey: ["cards", "due"] });
		},
	});
}
