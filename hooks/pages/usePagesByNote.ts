"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * ノート内のページ一覧を取得します。
 */
export function usePagesByNote(noteId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["pages", "by-note", noteId],
		queryFn: async () => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("pages")
				.select("*")
				.eq("note_id", noteId);
			if (error) throw error;
			return data;
		},
		enabled: !!noteId,
	});
}

