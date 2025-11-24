"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * 目標からデッキを削除
 */
export function useRemoveGoalDeckLink() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			goalId,
			deckId,
		}: {
			goalId: string;
			deckId: string;
		}): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { error } = await supabase
				.from("goal_deck_links")
				.delete()
				.eq("goal_id", goalId)
				.eq("deck_id", deckId);

			if (error) throw error;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["goal_decks", variables.goalId] });
		},
	});
}

