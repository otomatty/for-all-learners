"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ユーザーのデフォルトノートを取得します。
 * デフォルトノートは is_default_note フラグで識別されます。
 *
 * @example
 * ```ts
 * import { getDefaultNote } from "@/app/_actions/notes";
 *
 * const defaultNote = await getDefaultNote();
 * console.log("デフォルトノート:", defaultNote);
 * ```
 *
 * @returns ユーザーのデフォルトノートレコード
 * @throws Error if user is not authenticated or default note is not found
 */
export async function getDefaultNote() {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	// is_default_note フラグでデフォルトノートを取得
	// getNoteDetail と同じフィールドを取得
	const { data: defaultNote, error: fetchError } = await supabase
		.from("notes")
		.select(
			"id, slug, title, description, visibility, created_at, updated_at, page_count, participant_count, owner_id",
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
}

/**
 * Ensures that the user has a default note.
 * Default note should be created automatically during user registration,
 * but this function provides a fallback.
 *
 * @param userId - The user's ID
 * @returns The default note's ID and slug
 * @throws Error if default note cannot be found or created
 */
export async function ensureDefaultNote(userId: string) {
	const supabase = await getSupabaseClient();

	// Check if default note exists
	const { data: existingNote, error: checkError } = await supabase
		.from("notes")
		.select("id, slug")
		.eq("owner_id", userId)
		.eq("is_default_note", true)
		.maybeSingle();

	if (checkError) {
		throw checkError;
	}

	if (existingNote) {
		return { noteId: existingNote.id, slug: existingNote.slug };
	}

	// Default note should have been created by database trigger
	// If it doesn't exist, something went wrong
	throw new Error(
		"Default note not found. Please contact support or try logging out and back in.",
	);
}

/**
 * Links a page to the user's default note.
 *
 * @param userId - The user's ID
 * @param pageId - The page's ID to link
 * @returns True if successful
 */
export async function linkPageToDefaultNote(userId: string, pageId: string) {
	const supabase = await getSupabaseClient();

	// Get default note
	const { noteId } = await ensureDefaultNote(userId);

	// Check if link already exists
	const { data: existingLink } = await supabase
		.from("note_page_links")
		.select("id")
		.eq("note_id", noteId)
		.eq("page_id", pageId)
		.maybeSingle();

	if (existingLink) {
		return true; // Already linked
	}

	// Create link
	const { error } = await supabase
		.from("note_page_links")
		.insert({ note_id: noteId, page_id: pageId });

	if (error) {
		throw new Error("ページのリンクに失敗しました");
	}

	return true;
}
