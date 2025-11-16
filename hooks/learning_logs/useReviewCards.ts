"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type ReviewCard =
	Database["public"]["Tables"]["learning_logs"]["Row"] & {
		cards: Database["public"]["Tables"]["cards"]["Row"];
	};

/**
 * 復習対象のカード一覧を取得します。
 */
export function useReviewCards(limit = 5) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["learning_logs", "review", limit],
		queryFn: async (): Promise<ReviewCard[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Not authenticated");

			const now = new Date().toISOString();
			const { data, error } = await supabase
				.from("learning_logs")
				.select("*, cards(*)")
				.eq("user_id", user.id)
				.lte("next_review_at", now)
				.order("next_review_at", { ascending: true })
				.limit(limit);

			if (error) throw error;
			return (data ?? []) as ReviewCard[];
		},
	});
}
