"use client";

import React, { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Deck, DeckStudyLog } from "@/app/_actions/goal-decks";
import { DecksTable } from "./decks-table";
import { AddStudySessionDialog } from "./add-study-session-dialog";
import { AddDeckLinkDialog } from "./add-deck-link-dialog";
import { removeGoalDeckLink } from "@/app/_actions/goal-decks";

interface ClientGoalDecksSectionProps {
	goalId: string;
	initialDecks: Deck[];
	initialLogs: DeckStudyLog[];
}

/**
 * Client-side component for managing goal decks and study logs.
 */
export default function ClientGoalDecksSection({
	goalId,
	initialDecks,
	initialLogs,
}: ClientGoalDecksSectionProps) {
	const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	const handleLog = useCallback((deckId: string) => {
		setSelectedDeckId(deckId);
	}, []);

	const handleSuccess = useCallback(() => {
		setSelectedDeckId(null);
		router.refresh();
	}, [router]);

	// Handle deck removal
	const handleRemove = useCallback(
		(deckId: string) => {
			startTransition(async () => {
				await removeGoalDeckLink(goalId, deckId);
				router.refresh();
			});
		},
		[goalId, router],
	);

	// Handle deck addition success
	const handleAddLinkSuccess = useCallback(() => {
		router.refresh();
	}, [router]);

	return (
		<div className="space-y-4">
			{/* デッキ一覧と記録ボタン */}
			<DecksTable decks={initialDecks} onRemove={handleRemove} />

			{/* テーブル下部の+ボタンでデッキ追加 */}
			<AddDeckLinkDialog
				goalId={goalId}
				onSuccess={handleAddLinkSuccess}
				triggerText="＋ デッキを追加する"
			/>

			{/* 選択されたデッキの記録ダイアログ */}
			{selectedDeckId && (
				<AddStudySessionDialog
					deckId={selectedDeckId}
					onSuccess={handleSuccess}
				/>
			)}
		</div>
	);
}
