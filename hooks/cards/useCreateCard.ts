"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import { triggerQuestionGeneration } from "./utils";

export type Card = Database["public"]["Tables"]["cards"]["Row"];
export type CreateCardPayload = Omit<
	Database["public"]["Tables"]["cards"]["Insert"],
	"id"
>;

/**
 * カードを作成します。
 * 有料ユーザーの場合、バックグラウンドで問題プリジェネレーションを実行します。
 */
export function useCreateCard() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateCardPayload): Promise<Card> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("cards")
				.insert(payload)
				.select()
				.single();

			if (error) throw error;
			if (!data) throw new Error("createCard: no data returned");

			// バックグラウンドで問題プリジェネをキック（有料ユーザーのみ）
			await triggerQuestionGeneration(supabase, data);

			return data;
		},
		onSuccess: (data) => {
			// 関連するクエリを無効化
			queryClient.invalidateQueries({ queryKey: ["cards", data.id] });
			queryClient.invalidateQueries({
				queryKey: ["cards", "deck", data.deck_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["cards", "user", data.user_id],
			});
			queryClient.invalidateQueries({ queryKey: ["cards", "due"] });
		},
	});
}
