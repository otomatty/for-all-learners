"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface NoteDetail {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	visibility: "public" | "unlisted" | "invite" | "private";
	created_at: string;
	updated_at: string;
	page_count: number;
	participant_count: number;
	owner_id: string;
	is_default_note: boolean;
}

/**
 * ノートの詳細情報（メタデータ）を取得します。
 */
export function useNote(slug: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["note", slug],
		queryFn: async (): Promise<{ note: NoteDetail }> => {
			// Fetch note metadata
			const { data: note, error: noteError } = await supabase
				.from("notes")
				.select(
					"id, slug, title, description, visibility, created_at, updated_at, page_count, participant_count, owner_id, is_default_note",
				)
				.eq("slug", slug)
				.single();
			if (noteError || !note) throw noteError || new Error("Note not found");
			// Only return note metadata; page listing handled client-side via API
			return {
				note: {
					...note,
					visibility: note.visibility as
						| "public"
						| "unlisted"
						| "invite"
						| "private",
					is_default_note: note.is_default_note ?? false,
				},
			};
		},
		enabled: !!slug,
	});
}
