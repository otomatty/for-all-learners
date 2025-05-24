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
