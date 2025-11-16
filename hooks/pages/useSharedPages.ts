"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type SharedPage = Database["public"]["Tables"]["page_shares"]["Row"] & {
	pages: Database["public"]["Tables"]["pages"]["Row"];
};

/**
 * ユーザーに共有されたページ一覧を取得します。
 */
export function useSharedPages() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", "shared"],
		queryFn: async (): Promise<SharedPage[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("page_shares")
				.select("*, pages(*)")
				.eq("shared_with_user_id", user.id)
				.order("pages(updated_at)", { ascending: false });
			if (error) throw error;
			return data as SharedPage[];
		},
	});
}
