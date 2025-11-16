"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type Card = Database["public"]["Tables"]["cards"]["Row"];

/**
 * カードを削除します。
 */
export function useDeleteCard() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<Card> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("cards")
				.delete()
				.eq("id", id)
				.select()
				.single();

			if (error) throw error;
			if (!data) throw new Error("deleteCard: no data returned");
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
