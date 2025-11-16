"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type CardSummary = Pick<
	Database["public"]["Tables"]["cards"]["Row"],
	"id"
>;

/**
 * ユーザーのカード一覧（IDのみ）を取得します。
 * @param userId ユーザーID
 */
export function useCardsByUser(userId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["cards", "user", userId],
		queryFn: async (): Promise<CardSummary[]> => {
			const { data, error } = await supabase
				.from("cards")
				.select("id")
				.eq("user_id", userId);

			if (error) throw error;
			return data ?? [];
		},
		enabled: !!userId,
	});
}
