"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface UserPage {
	id: string;
	title: string;
}

/**
 * ユーザーの全ページ（IDとタイトルのみ）を取得します。
 * ページリンク機能のためのタイトル→IDマッピング作成に使用。
 */
export function useAllUserPages(userId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["all-user-pages", userId],
		queryFn: async (): Promise<UserPage[]> => {
			const { data, error } = await supabase
				.from("pages")
				.select("id, title")
				.eq("user_id", userId);

			if (error) throw error;

			return data ?? [];
		},
		enabled: !!userId,
	});
}
