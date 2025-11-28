"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type { CreateNoteDeckLinkPayload } from "@/types/note-deck-links";

export type Note = Database["public"]["Tables"]["notes"]["Row"];

/**
 * デッキにリンクされたノートを取得
 */
export function useNotesLinkedToDeck(deckId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["notes_linked_to_deck", deckId],
		queryFn: async (): Promise<Note[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { data, error } = await supabase
				.from("note_deck_links")
				.select(
					`
					note:notes (
						id,
						slug,
						title,
						description,
						visibility,
						created_at,
						updated_at,
						page_count,
						participant_count,
						owner_id,
						is_default_note
					)
				`,
				)
				.eq("deck_id", deckId);

			if (error) throw error;

			// Transform the data structure
			return (data || [])
				.map((link: { note: unknown }) => {
					if (link.note && typeof link.note === "object") {
						return link.note as Note;
					}
					return null;
				})
				.filter((note): note is Note => note !== null);
		},
	});
}

/**
 * デッキにリンク可能なノートを取得（ユーザーが所有するノートのうち、まだリンクされていないもの）
 */
export function useAvailableNotesForDeck(deckId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["available_notes_for_deck", deckId],
		queryFn: async (): Promise<Note[]> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			// Get notes already linked to this deck
			const { data: linkedNotes, error: linkedError } = await supabase
				.from("note_deck_links")
				.select("note_id")
				.eq("deck_id", deckId);

			if (linkedError) throw linkedError;

			const linkedNoteIds = (linkedNotes || []).map((link) => link.note_id);

			// Get all user's notes that are not linked
			const notesQuery = supabase
				.from("notes")
				.select("*")
				.eq("owner_id", user.id);

			const { data: notes, error: notesError } =
				linkedNoteIds.length > 0
					? await notesQuery.not("id", "in", `(${linkedNoteIds.join(",")})`)
					: await notesQuery;

			if (notesError) throw notesError;

			return (notes || []) as Note[];
		},
	});
}

/**
 * ノートとデッキのリンクを作成
 */
export function useCreateNoteDeckLink() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (payload: CreateNoteDeckLinkPayload): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { error } = await supabase.from("note_deck_links").insert({
				note_id: payload.note_id,
				deck_id: payload.deck_id,
				created_by: user.id,
			});

			if (error) throw error;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["notes_linked_to_deck", variables.deck_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["available_notes_for_deck", variables.deck_id],
			});
		},
	});
}

/**
 * ノートとデッキのリンクを削除
 */
export function useRemoveNoteDeckLink() {
	const supabase = createClient();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			noteId,
			deckId,
		}: {
			noteId: string;
			deckId: string;
		}): Promise<void> => {
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();
			if (userError || !user) throw new Error("User not authenticated");

			const { error } = await supabase
				.from("note_deck_links")
				.delete()
				.eq("note_id", noteId)
				.eq("deck_id", deckId);

			if (error) throw error;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["notes_linked_to_deck", variables.deckId],
			});
			queryClient.invalidateQueries({
				queryKey: ["available_notes_for_deck", variables.deckId],
			});
		},
	});
}
