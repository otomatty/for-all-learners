"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * デッキの学習ログを追加
 */
export function useAddDeckStudyLog() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			deckId,
			date,
		}: {
			deckId: string;
			date: string;
		}): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { error } = await supabase.from("deck_study_logs").insert({
				deck_id: deckId,
				user_id: user.id,
				study_date: date,
			});

			if (error) throw error;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["goal_decks"] });
		},
	});
}

