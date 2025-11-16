"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface DefaultNote {
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
 * ユーザーのデフォルトノートを取得します。
 * デフォルトノートは is_default_note フラグで識別されます。
 */
export function useDefaultNote() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["default-note"],
		queryFn: async (): Promise<DefaultNote> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// is_default_note フラグでデフォルトノートを取得
			const { data: defaultNote, error: fetchError } = await supabase
				.from("notes")
				.select(
					"id, slug, title, description, visibility, created_at, updated_at, page_count, participant_count, owner_id, is_default_note",
				)
				.eq("owner_id", user.id)
				.eq("is_default_note", true)
				.maybeSingle();

			if (fetchError) throw fetchError;

			if (!defaultNote) {
				throw new Error(
					"Default note not found. This should have been created during user registration.",
				);
			}

			return defaultNote;
		},
	});
}
