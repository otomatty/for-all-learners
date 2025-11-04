"use client";

import { useState } from "react";
import type { Database } from "@/types/database.types";
import NotePagesClient from "../page-client";
import NoteHeader from "./note-header";

type Deck = Database["public"]["Tables"]["decks"]["Row"];

interface NotePageWrapperProps {
	note: {
		id: string;
		title: string;
		slug: string;
		description: string | null;
		visibility: "public" | "unlisted" | "invite" | "private";
		pageCount: number;
		participantCount: number;
		updatedAt: string;
		ownerId: string;
		isDefaultNote: boolean;
	};
	linkedDecks: Deck[];
	availableDecks: Deck[];
}

export default function NotePageWrapper({
	note,
	linkedDecks,
	availableDecks,
}: NotePageWrapperProps) {
	const [deckDialogOpen, setDeckDialogOpen] = useState(false);

	return (
		<>
			<NoteHeader {...note} onOpenDeckDialog={() => setDeckDialogOpen(true)} />
			<NotePagesClient
				slug={note.slug}
				totalCount={note.pageCount}
				noteId={note.id}
				linkedDecks={linkedDecks}
				availableDecks={availableDecks}
				deckDialogOpen={deckDialogOpen}
				setDeckDialogOpen={setDeckDialogOpen}
			/>
		</>
	);
}
