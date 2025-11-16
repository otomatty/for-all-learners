"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserPlanFeatures, isUserPaid } from "@/app/_actions/subscriptions";
import type { QuestionType } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Card = Database["public"]["Tables"]["cards"]["Row"];
export type UpdateCardPayload = {
	id: string;
	updates: Database["public"]["Tables"]["cards"]["Update"];
};

/**
 * カードを更新します。
 * 有料ユーザーの場合、バックグラウンドで問題プリジェネレーションを実行します。
 */
export function useUpdateCard() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, updates }: UpdateCardPayload): Promise<Card> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("cards")
				.update(updates)
				.eq("id", id)
				.select()
				.single();

			if (error) throw error;
			if (!data) throw new Error("updateCard: no data returned");

			// バックグラウンドで問題プリジェネをキック（有料ユーザーのみ）
			try {
				const paid = await isUserPaid(data.user_id);
				if (paid) {
					const features = (await getUserPlanFeatures(data.user_id)) || [];
					const { data: settings } = await supabase
						.from("user_settings")
						.select("locale")
						.eq("user_id", data.user_id)
						.single();
					const locale = settings?.locale ?? "ja";
					for (const type of features as QuestionType[]) {
						await supabase.functions.invoke("generate-questions-bg", {
							body: JSON.stringify({
								cardId: data.id,
								type,
								locale,
								userId: data.user_id,
							}),
						});
					}
				}
			} catch (_err) {
				// バックグラウンド処理のエラーは無視
			}

			return data;
		},
		onSuccess: (data) => {
			// 関連するクエリを無効化
			queryClient.invalidateQueries({ queryKey: ["cards", data.id] });
			queryClient.invalidateQueries({
				queryKey: ["cards", "deck", data.deck_id],
			});
			queryClient.invalidateQueries({ queryKey: ["cards"] });
		},
	});
}
