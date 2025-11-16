"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface NoteShare {
	shared_with_user_id: string;
	permission_level: "editor" | "viewer";
	created_at: string;
}

/**
 * 指定したノートの共有ユーザー一覧を取得します。
 */
export function useNoteShares(noteId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["note-shares", noteId],
		queryFn: async (): Promise<NoteShare[]> => {
			const { data, error } = await supabase
				.from("note_shares")
				.select("shared_with_user_id, permission_level, created_at")
				.eq("note_id", noteId);
			if (error) throw error;
			return data;
		},
		enabled: !!noteId,
	});
}
