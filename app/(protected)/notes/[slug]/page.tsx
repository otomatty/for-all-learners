import { redirect } from "next/navigation";
import React from "react";
import {
	getAvailableDecksForNote,
	getDecksLinkedToNote,
} from "@/app/_actions/note-deck-links";
import { getNoteDetail } from "@/app/_actions/notes";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import { NoteDeckManager } from "./_components/note-deck-manager";
import NoteHeader from "./_components/note-header";
import NotePagesClient from "./page-client";

interface NoteDetailPageProps {
	params: Promise<{ slug: string }>;
}

export default async function NoteDetailPage({ params }: NoteDetailPageProps) {
	const { slug } = await params;
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		redirect("/auth/login");
	}

	const { note } = await getNoteDetail(slug);

	// Note-Deck Links データ取得
	const [linkedDecks, availableDecks] = await Promise.all([
		getDecksLinkedToNote(note.id).catch(() => []),
		getAvailableDecksForNote(note.id).catch(() => []),
	]);

	return (
		<Container className="max-w-7xl">
			<BackLink path="/notes" title="Notes一覧へ戻る" />
			<NoteHeader
				id={note.id}
				title={note.title}
				slug={note.slug}
				description={note.description}
				visibility={
					note.visibility as "public" | "unlisted" | "invite" | "private"
				}
				pageCount={note.page_count}
				participantCount={note.participant_count}
				updatedAt={note.updated_at}
				ownerId={note.owner_id}
			/>
			<div className="flex flex-col lg:flex-row gap-6">
				<div className="flex-1">
					<NotePagesClient slug={slug} totalCount={note.page_count} />
				</div>
				<div className="lg:w-80 lg:shrink-0">
					<NoteDeckManager
						noteId={note.id}
						linkedDecks={linkedDecks}
						availableDecks={availableDecks}
					/>
				</div>
			</div>
		</Container>
	);
}
