import { redirect } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { createClient } from "@/lib/supabase/server";
import NotePageWrapper from "./_components/NotePageWrapper";

interface NoteDetailPageProps {
	params: Promise<{ slug: string }>;
}

// Generate static params for dynamic routes
// Returns empty array to enable dynamic rendering for all routes
// Phase 6: Next.js静的化とTauri統合 (Issue #157)
export async function generateStaticParams() {
	return [];
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
	type NoteData = {
		id: string;
		slug: string;
		title: string;
		description: string | null;
		visibility: string;
		created_at: string;
		updated_at: string;
		page_count: number;
		participant_count: number;
		owner_id: string;
		is_default_note: boolean | null;
	};

	let note: NoteData;
	if (slug === "default") {
		// Get user's default note (with is_default_note flag)
		const { data: defaultNote, error: noteError } = await supabase
			.from("notes")
			.select(
				"id, slug, title, description, visibility, created_at, updated_at, page_count, participant_count, owner_id, is_default_note",
			)
			.eq("owner_id", user.id)
			.eq("is_default_note", true)
			.single();

		if (noteError || !defaultNote) {
			throw new Error("Default note not found");
		}

		note = defaultNote;
	} else {
		// Get note by slug
		const { data: noteData, error: noteError } = await supabase
			.from("notes")
			.select(
				"id, slug, title, description, visibility, created_at, updated_at, page_count, participant_count, owner_id, is_default_note",
			)
			.eq("slug", slug)
			.single();

		if (noteError || !noteData) {
			throw new Error("Note not found");
		}

		note = noteData;
	}

	// Note-Deck Links データ取得
	const [linkedDecksResult, availableDecksResult] = await Promise.allSettled([
		supabase
			.from("note_deck_links")
			.select(
				`
				deck:decks (
					id,
					title,
					description,
					is_public,
					created_at,
					updated_at,
					user_id
				)
			`,
			)
			.eq("note_id", note.id),
		supabase
			.from("decks")
			.select(
				"id, title, description, is_public, created_at, updated_at, user_id",
			)
			.eq("user_id", user.id),
	]);

	const linkedDecksData =
		linkedDecksResult.status === "fulfilled"
			? linkedDecksResult.value.data || []
			: [];
	const availableDecksData =
		availableDecksResult.status === "fulfilled"
			? availableDecksResult.value.data || []
			: [];

	const linkedDeckIds = new Set(
		linkedDecksData
			.map((link: { deck: unknown }) => {
				if (link.deck && typeof link.deck === "object" && "id" in link.deck) {
					return link.deck.id as string;
				}
				return null;
			})
			.filter(Boolean),
	);

	type DeckData = {
		id: string;
		title: string;
		description: string | null;
		is_public: boolean | null;
		created_at: string;
		updated_at: string;
		user_id: string;
	};

	const linkedDecks: DeckData[] =
		linkedDecksData
			.map((link: { deck: unknown }) => link.deck)
			.filter((deck): deck is DeckData => {
				return (
					typeof deck === "object" &&
					deck !== null &&
					"id" in deck &&
					"title" in deck
				);
			}) || [];
	const availableDecks: DeckData[] =
		(availableDecksData as DeckData[]).filter(
			(deck) => !linkedDeckIds.has(deck.id),
		) || [];

	return (
		<Container className="max-w-7xl">
			<BackLink path="/notes" title="Notes一覧へ戻る" />
			<NotePageWrapper
				note={{
					id: note.id,
					title: note.title,
					slug: note.slug,
					description: note.description,
					visibility: note.visibility as
						| "public"
						| "unlisted"
						| "invite"
						| "private",
					pageCount: note.page_count,
					participantCount: note.participant_count,
					updatedAt: note.updated_at,
					ownerId: note.owner_id,
					isDefaultNote: note.is_default_note || false,
				}}
				linkedDecks={linkedDecks}
				availableDecks={availableDecks}
			/>
		</Container>
	);
}
