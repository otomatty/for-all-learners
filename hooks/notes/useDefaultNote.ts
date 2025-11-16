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

type VisibilityValue = "public" | "unlisted" | "invite" | "private";

/**
 * Validates that a string is a valid visibility value.
 * This is a type guard function that narrows the type.
 */
function isValidVisibility(value: string): value is VisibilityValue {
	return (
		value === "public" ||
		value === "unlisted" ||
		value === "invite" ||
		value === "private"
	);
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

			// Map database result to DefaultNote type
			// visibility is validated by database CHECK constraint, but TypeScript needs explicit validation
			if (!isValidVisibility(defaultNote.visibility)) {
				throw new Error(`Invalid visibility value: ${defaultNote.visibility}`);
			}

			return {
				id: defaultNote.id,
				slug: defaultNote.slug,
				title: defaultNote.title,
				description: defaultNote.description,
				visibility: defaultNote.visibility,
				created_at: defaultNote.created_at,
				updated_at: defaultNote.updated_at,
				page_count: defaultNote.page_count,
				participant_count: defaultNote.participant_count,
				owner_id: defaultNote.owner_id,
				is_default_note: defaultNote.is_default_note ?? false,
			};
		},
	});
}
