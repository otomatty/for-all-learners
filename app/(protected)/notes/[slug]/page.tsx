import { redirect } from "next/navigation";
import {
	getAvailableDecksForNote,
	getDecksLinkedToNote,
} from "@/app/_actions/note-deck-links";
import { getDefaultNote, getNoteDetail } from "@/app/_actions/notes";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
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

	// Handle special "default" slug
	let note: Awaited<ReturnType<typeof getDefaultNote>>;
	if (slug === "default") {
		// Get user's default note (with is_default_note flag)
		note = await getDefaultNote();
	} else {
		// Get note by slug
		const result = await getNoteDetail(slug);
		note = result.note;
	}

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
				isDefaultNote={note.is_default_note || false}
			/>
			<NotePagesClient
				slug={slug}
				totalCount={note.page_count}
				noteId={note.id}
				linkedDecks={linkedDecks}
				availableDecks={availableDecks}
			/>
		</Container>
	);
}
