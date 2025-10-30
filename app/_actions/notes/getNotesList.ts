"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ユーザーが所有または共有されたノートの一覧を取得します。
 *
 * @example
 * ```ts
 * import { getNotesList } from "@/app/_actions/notes";
 *
 * const notes = await getNotesList();
 * notes.forEach(note => console.log(note.title, note.visibility));
 * ```
 *
 * @returns ノートのサマリー配列（id, slug, title, description, visibility, pageCount, participantCount, updatedAt）
 */
export async function getNotesList() {
	const supabase = await getSupabaseClient();
	// Authentication
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");
	// Fetch notes owned by user
	const { data: ownedNotes, error: ownedError } = await supabase
		.from("notes")
		.select(
			"id, slug, title, description, visibility, updated_at, page_count, participant_count",
		)
		.eq("owner_id", user.id);
	if (ownedError) throw ownedError;
	// Fetch notes shared with user
	const { data: sharedLinks, error: sharedError } = await supabase
		.from("note_shares")
		.select("note_id")
		.eq("shared_with_user_id", user.id);
	if (sharedError) throw sharedError;
	const sharedNoteIds = sharedLinks.map((s) => s.note_id);
	const { data: sharedNotes, error: sharedNotesError } = sharedNoteIds.length
		? await supabase
				.from("notes")
				.select(
					"id, slug, title, description, visibility, updated_at, page_count, participant_count",
				)
				.in("id", sharedNoteIds)
		: { data: [], error: null };
	if (sharedNotesError) throw sharedNotesError;
	// Combine and map to NoteSummary, removing duplicates by id
	const allNotes = [...ownedNotes, ...sharedNotes];
	const uniqueNotesMap = new Map(allNotes.map((note) => [note.id, note]));
	return Array.from(uniqueNotesMap.values()).map((n) => ({
		id: n.id,
		slug: n.slug,
		title: n.title,
		description: n.description,
		visibility: n.visibility as "public" | "unlisted" | "invite" | "private",
		pageCount: n.page_count,
		participantCount: n.participant_count,
		updatedAt: n.updated_at || "",
	}));
}
