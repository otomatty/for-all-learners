"use client";

import { Suspense, useEffect, useState } from "react";
import {
	getAvailableNotesForDeck,
	getNotesLinkedToDeck,
} from "@/app/_actions/note-deck-links";
import { Container } from "@/components/layouts/container";
import { BackLink } from "@/components/ui/back-link";
import { useDeck, useDecks } from "@/hooks/decks";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
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
	const { data: deck, isLoading: isLoadingDeck } = useDeck(deckId);
	const { data: userDecks, isLoading: isLoadingDecks } = useDecks();
	const [canEdit, setCanEdit] = useState(false);
	const [linkedNotes, setLinkedNotes] = useState<
		Database["public"]["Tables"]["notes"]["Row"][]
	>([]);
	const [availableNotes, setAvailableNotes] = useState<
		Database["public"]["Tables"]["notes"]["Row"][]
	>([]);

	useEffect(() => {
		if (!deck) return;

		// デッキの所有者かどうかを確認
		const isOwner = deck.user_id === userId;

		// 共有されているデッキの場合、権限を確認
		if (!isOwner) {
			const supabase = createClient();
			void Promise.resolve(
				supabase
					.from("deck_shares")
					.select("permission_level")
					.eq("deck_id", deckId)
					.eq("shared_with_user_id", userId)
					.single(),
			)
				.then(({ data: share }) => {
					if (share) {
						const permission = share.permission_level;
						setCanEdit(permission === "edit");
					} else {
						// 共有されていない場合はリダイレクト
						window.location.href = "/decks";
					}
				})
				.catch(() => {
					window.location.href = "/decks";
				});
		} else {
			setCanEdit(true);
		}
	}, [deck, deckId, userId]);

	useEffect(() => {
		if (!canEdit) return;

		// Note-Deck Links データ取得（管理権限がある場合のみ）
		Promise.all([
			getNotesLinkedToDeck(deckId).catch(() => []),
			getAvailableNotesForDeck(deckId).catch(() => []),
		]).then(([linked, available]) => {
			setLinkedNotes(linked);
			setAvailableNotes(available);
		});
	}, [canEdit, deckId]);

	if (isLoadingDeck || isLoadingDecks) {
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
