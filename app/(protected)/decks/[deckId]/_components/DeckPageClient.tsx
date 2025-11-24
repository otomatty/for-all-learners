"use client";

import { Suspense } from "react";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { useDeckPermissions, useDecks } from "@/hooks/decks";
import {
	useAvailableNotesForDeck,
	useNotesLinkedToDeck,
} from "@/hooks/decks/useNoteDeckLinks";
import ActionMenu from "./ActionMenu";
import { CardsList } from "./CardList/CardsList";
import { CardsListSkeleton } from "./CardList/CardsListSkeleton";
import { DeckNoteManager } from "./DeckNoteManager";
import DeckSelector from "./DeckSelector";

interface DeckPageClientProps {
	deckId: string;
	userId: string;
}

export function DeckPageClient({ deckId, userId }: DeckPageClientProps) {
	const {
		deck,
		canEdit,
		isLoading: isLoadingPermissions,
	} = useDeckPermissions(deckId, userId);
	const isLoadingDeck = isLoadingPermissions;
	const { data: userDecks, isLoading: isLoadingDecks } = useDecks();
	const { data: linkedNotes = [], isLoading: isLoadingLinkedNotes } =
		useNotesLinkedToDeck(deckId);
	const { data: availableNotes = [], isLoading: isLoadingAvailableNotes } =
		useAvailableNotesForDeck(deckId);

	if (
		isLoadingDeck ||
		isLoadingDecks ||
		isLoadingPermissions ||
		(canEdit && (isLoadingLinkedNotes || isLoadingAvailableNotes))
	) {
		return (
			<Container>
				<div className="flex items-center justify-center h-40">
					<p className="text-muted-foreground">読み込み中...</p>
				</div>
			</Container>
		);
	}

	if (!deck) {
		return null; // redirect will happen in useEffect
	}

	const decksList = userDecks?.map(({ id, title }) => ({ id, title })) ?? [];

	return (
		<Container>
			<BackLink title="デッキ一覧に戻る" path="/decks" />
			<DeckSelector decks={decksList} currentDeckId={deckId} />
			{canEdit && (
				<ActionMenu
					deckId={deckId}
					userId={userId}
					deckTitle={deck.title}
					deckDescription={deck.description ?? ""}
					deckIsPublic={deck.is_public ?? false}
				/>
			)}
			<div className="flex gap-4">
				<div className="flex-1">
					<Suspense fallback={<CardsListSkeleton deckId={deckId} />}>
						<CardsList deckId={deckId} canEdit={canEdit} userId={userId} />
					</Suspense>
				</div>
				{canEdit && (
					<div className="w-80 shrink-0">
						<DeckNoteManager
							deckId={deckId}
							linkedNotes={linkedNotes}
							availableNotes={availableNotes}
						/>
					</div>
				)}
			</div>
		</Container>
	);
}
