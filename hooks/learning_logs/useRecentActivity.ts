"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type RecentActivity =
	Database["public"]["Tables"]["learning_logs"]["Row"] & {
		cards: Database["public"]["Tables"]["cards"]["Row"];
	};

/**
 * 最近の活動を取得します。
 */
export function useRecentActivity(limit = 5) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["learning_logs", "recent", limit],
		queryFn: async (): Promise<RecentActivity[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("Not authenticated");

			const { data, error } = await supabase
				.from("learning_logs")
				.select("*, cards(*)")
				.eq("user_id", user.id)
				.order("answered_at", { ascending: false })
				.limit(limit);

			if (error) throw error;
			return (data ?? []) as RecentActivity[];
		},
	});
}
