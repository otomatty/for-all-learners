/**
 * Notes Service
 * Server-side service functions for notes operations
 * Extracted from hooks/notes/useNotes.ts
 */

import { createClient } from "@/lib/supabase/server";

export interface NoteSummary {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	visibility: "public" | "unlisted" | "invite" | "private";
	pageCount: number;
	participantCount: number;
	updatedAt: string;
}

/**
 * Get user's notes (owned and shared) from server
 * Extracted from hooks/notes/useNotes.ts
 */
export async function getNotesServer(userId: string): Promise<NoteSummary[]> {
	const supabase = await createClient();

	// Fetch notes owned by user
	const { data: ownedNotes, error: ownedError } = await supabase
		.from("notes")
		.select(
			"id, slug, title, description, visibility, updated_at, page_count, participant_count",
		)
		.eq("owner_id", userId);
	if (ownedError) throw ownedError;

	// Fetch notes shared with user
	const { data: sharedLinks, error: sharedError } = await supabase
		.from("note_shares")
		.select("note_id")
		.eq("shared_with_user_id", userId);
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
