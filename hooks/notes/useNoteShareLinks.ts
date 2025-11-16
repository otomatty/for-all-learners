"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface ShareLink {
	token: string;
	permission_level: string;
	created_at: string;
	expires_at: string | null;
}

/**
 * 指定したノートの共有リンク一覧を取得します。
 */
export function useNoteShareLinks(noteId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["note-share-links", noteId],
		queryFn: async (): Promise<ShareLink[]> => {
			const { data, error } = await supabase
				.from("share_links")
				.select("token, permission_level, created_at, expires_at")
				.eq("resource_type", "note")
				.eq("resource_id", noteId);
			if (error) throw error;
			return data;
		},
		enabled: !!noteId,
	});
}
