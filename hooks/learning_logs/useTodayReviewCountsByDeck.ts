"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type TodayReviewCountByDeck = {
	deck_id: string;
	review_count: number;
};

/**
 * ユーザーが当日レビュー済みのカード数をデッキごとに集計して返します。
 *
 * Phase 2対応: RPC関数 `get_today_review_counts_by_deck` を使用して
 * データベース側で集計処理を実行し、パフォーマンスを改善します。
 * GROUP BY句を使用して効率的に集計を行います。
 */
export function useTodayReviewCountsByDeck() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["learning_logs", "today_review_counts"],
		queryFn: async (): Promise<TodayReviewCountByDeck[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Not authenticated");

			// RPC関数を呼び出してデータベース側で集計
			const { data, error } = await supabase.rpc(
				"get_today_review_counts_by_deck",
				{
					p_user_id: user.id,
				},
			);

			if (error) {
				throw new Error(error.message || "レビュー数の取得に失敗しました");
			}

			// RPC関数の戻り値を型に合わせて変換
			return (data ?? []).map(
				(row: { deck_id: string; review_count: number }) => ({
					deck_id: row.deck_id,
					review_count: row.review_count,
				}),
			);
		},
	});
}
