"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ページ詳細を取得します。
 */
export function usePage(id: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", id],
		queryFn: async () => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("pages")
				.select("*")
				.eq("id", id)
				.single();
			if (error) throw error;
			return data;
		},
		enabled: !!id,
	});
}
