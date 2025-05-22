"use server";
import type { Database } from "@/types/database.types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

/**
 * Payload for creating a note.
 */
export type CreateNotePayload = {
	slug: string;
	title: string;
	description?: string;
	visibility?: "public" | "unlisted" | "invite" | "private";
};

/**
 * Payload for updating a note (partial).
 */
export type UpdateNotePayload = Partial<CreateNotePayload>;

/**
 * Get a Supabase client with our Database typing.
 */
async function getSupabaseClient(): Promise<SupabaseClient<Database>> {
	return await createClient();
}

/**
 * Create a new note.
 * @param payload - Note details to create.
 * @returns The created note record.
 */
export async function createNote(payload: CreateNotePayload) {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	const { slug, title, description, visibility } = payload;
	const { data, error } = await supabase
		.from("notes")
		.insert([{ owner_id: user.id, slug, title, description, visibility }])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

/**
 * Update an existing note.
 * @param id - Note ID to update.
 * @param payload - Fields to update.
 * @returns The updated note record.
 */
export async function updateNote(id: string, payload: UpdateNotePayload) {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	const { data: existing, error: fetchError } = await supabase
		.from("notes")
		.select("visibility")
		.eq("id", id)
		.single();
	if (fetchError || !existing) throw fetchError;

	const oldVisibility = existing.visibility;
	const newVisibility = payload.visibility;

	const { data: updated, error: updateError } = await supabase
		.from("notes")
		.update(payload)
		.eq("id", id)
		.select("*")
		.single();
	if (updateError) throw updateError;

	// If visibility changed, clear existing shares and links
	if (newVisibility && newVisibility !== oldVisibility) {
		const { error: delSharesError } = await supabase
			.from("note_shares")
			.delete()
			.eq("note_id", id)
			.neq("shared_with_user_id", user.id);
		if (delSharesError) throw delSharesError;

		const { error: delLinksError } = await supabase
			.from("share_links")
			.delete()
			.eq("resource_type", "note")
			.eq("resource_id", id);
		if (delLinksError) throw delLinksError;
	}

	return updated;
}

/**
 * Delete a note by ID.
 * @param id - Note ID to delete.
 */
export async function deleteNote(id: string) {
	const supabase = await getSupabaseClient();
	const { error } = await supabase.from("notes").delete().eq("id", id);
	if (error) throw error;
}

/**
 * Link a page to a note.
 * @param noteId - Note ID.
 * @param pageId - Page ID.
 * @returns The created link record.
 */
export async function linkPageToNote(noteId: string, pageId: string) {
	const supabase = await getSupabaseClient();
	const { data, error } = await supabase
		.from("note_page_links")
		.insert([{ note_id: noteId, page_id: pageId }])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

/**
 * Unlink a page from a note.
 * @param noteId - Note ID.
 * @param pageId - Page ID.
 */
export async function unlinkPageFromNote(noteId: string, pageId: string) {
	const supabase = await getSupabaseClient();
	const { error } = await supabase
		.from("note_page_links")
		.delete()
		.eq("note_id", noteId)
		.eq("page_id", pageId);
	if (error) throw error;
}

/**
 * Share a note with a user.
 * @param noteId - Note ID.
 * @param userId - User ID to share with.
 * @param permission - Permission level ('editor' or 'viewer').
 * @returns The created share record.
 */
export async function shareNote(
	noteId: string,
	userId: string,
	permission: "editor" | "viewer",
) {
	const supabase = await getSupabaseClient();
	const { data, error } = await supabase
		.from("note_shares")
		.insert([
			{
				note_id: noteId,
				shared_with_user_id: userId,
				permission_level: permission,
			},
		])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

/**
 * Unshare a note from a user.
 * @param noteId - Note ID.
 * @param userId - User ID to remove.
 */
export async function unshareNote(noteId: string, userId: string) {
	const supabase = await getSupabaseClient();
	const { error } = await supabase
		.from("note_shares")
		.delete()
		.eq("note_id", noteId)
		.eq("shared_with_user_id", userId);
	if (error) throw error;
}

/**
 * Generate a share link for a note.
 * @param noteId - Note ID.
 * @param permission - Permission for the link ('viewer').
 * @returns The created share link record.
 */
export async function generateNoteShareLink(
	noteId: string,
	permission: "viewer",
) {
	const supabase = await getSupabaseClient();
	const token = randomUUID();
	const { data, error } = await supabase
		.from("share_links")
		.insert([
			{
				resource_type: "note",
				resource_id: noteId,
				token,
				permission_level: permission,
			},
		])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

/**
 * Revoke a share link by token.
 * @param token - Share link token.
 */
export async function revokeNoteShareLink(token: string) {
	const supabase = await getSupabaseClient();
	const { error } = await supabase
		.from("share_links")
		.update({ expires_at: new Date().toISOString() })
		.eq("token", token);
	if (error) throw error;
}

/**
 * Join a note via a share link token.
 * @param token - Share link token.
 * @returns The created share record.
 */
export async function joinNoteByLink(token: string) {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	const { data: link, error: linkError } = await supabase
		.from("share_links")
		.select("resource_id, resource_type, permission_level, expires_at")
		.eq("token", token)
		.single();
	if (linkError) throw linkError;
	if (link.resource_type !== "note") throw new Error("Invalid resource type");
	if (link.expires_at && new Date(link.expires_at) < new Date())
		throw new Error("Link has expired");

	const { data, error } = await supabase
		.from("note_shares")
		.insert([
			{
				note_id: link.resource_id,
				shared_with_user_id: user.id,
				permission_level: link.permission_level,
			},
		])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

/**
 * Join a public note by slug (gives editor permission).
 * @param slug - Note slug.
 * @returns The created share record.
 */
export async function joinNotePublic(slug: string) {
	const supabase = await getSupabaseClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) throw new Error("User not authenticated");

	const { data: note, error: noteError } = await supabase
		.from("notes")
		.select("id")
		.eq("slug", slug)
		.eq("visibility", "public")
		.single();
	if (noteError || !note) throw noteError;

	const { data, error } = await supabase
		.from("note_shares")
		.insert([
			{
				note_id: note.id,
				shared_with_user_id: user.id,
				permission_level: "editor",
			},
		])
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

/**
 * Fetch note details with linked pages.
 * @param slug - Note slug
 */
export async function getNoteDetail(slug: string) {
	const supabase = await getSupabaseClient();
	// Fetch note metadata
	const { data: note, error: noteError } = await supabase
		.from("notes")
		.select(
			"id, slug, title, description, visibility, updated_at, page_count, participant_count",
		)
		.eq("slug", slug)
		.single();
	if (noteError || !note) throw noteError || new Error("Note not found");
	// Only return note metadata; page listing handled client-side via API
	return { note };
}

/**
 * Fetch list of notes owned or shared with the user.
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
	// Combine and map to NoteSummary
	const allNotes = [...ownedNotes, ...sharedNotes];
	return allNotes.map((n) => ({
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

// I'm adding a server action to fetch note pages with pagination
export async function getNotePages({
	slug,
	limit,
	offset,
	sortBy,
}: {
	slug: string;
	limit: number;
	offset: number;
	sortBy: "updated" | "created";
}): Promise<{
	pages: Database["public"]["Tables"]["pages"]["Row"][];
	totalCount: number;
}> {
	console.log("Debug [getNotePages]: args", { slug, limit, offset, sortBy });
	const supabase = await getSupabaseClient();
	// Fetch note ID by slug
	const { data: note, error: noteError } = await supabase
		.from("notes")
		.select("id")
		.eq("slug", slug)
		.single();
	console.log("Debug [getNotePages]: note result", { note, noteError });
	if (noteError || !note) throw new Error("Note not found");

	// Fetch pages via RPC
	const { data: rpcData, error: rpcError } = await supabase.rpc(
		"get_note_pages",
		{
			p_note_id: note.id,
			p_limit: limit,
			p_offset: offset,
			p_sort: sortBy,
		},
	);
	if (rpcError) throw rpcError;
	const pages = (rpcData?.[0]?.pages ??
		[]) as Database["public"]["Tables"]["pages"]["Row"][];
	const totalCount = rpcData?.[0]?.total_count ?? 0;
	return { pages, totalCount };
}
