"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useRemoveGoalDeckLink, type Deck } from "@/hooks/goal_decks";
import { AddDeckLinkDialog } from "./AddDeckLinkDialog";
import { AddStudySessionDialog } from "./AddStudySessionDialog";
// components
import { DecksTable } from "./decks-table";
import { MobileDecksList } from "./MobileDecksList";

// Deck type extends base Deck and adds today's review count
export interface DeckWithReviewCount extends Deck {
	todayReviewCount: number;
}

interface ClientGoalDecksSectionProps {
	goalId: string;
	initialDecks: DeckWithReviewCount[];
}

/**
 * Client-side component for managing goal decks and study logs.
 */
export default function ClientGoalDecksSection({
	goalId,
	initialDecks,
}: ClientGoalDecksSectionProps) {
	const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
	const router = useRouter();
	const removeGoalDeckLinkMutation = useRemoveGoalDeckLink();

	const handleSuccess = useCallback(() => {
		setSelectedDeckId(null);
		router.refresh();
	}, [router]);

	// Handle deck removal
	const handleRemove = useCallback(
		async (deckId: string) => {
			await removeGoalDeckLinkMutation.mutateAsync({ goalId, deckId });
			router.refresh();
		},
		[goalId, router, removeGoalDeckLinkMutation],
	);

	// Handle deck addition success
	const handleAddLinkSuccess = useCallback(() => {
		router.refresh();
	}, [router]);

	return (
		<div>
			{/* デスクトップ: テーブル一覧 */}
			<div className="hidden md:block">
				<DecksTable decks={initialDecks} onRemove={handleRemove} />
			</div>
			{/* モバイル: リスト一覧 */}
			<div className="block md:hidden">
				<MobileDecksList decks={initialDecks} onRemove={handleRemove} />
			</div>

			{/* テーブル下部の+ボタンでデッキ追加 */}
			<div className="flex justify-center">
				<AddDeckLinkDialog
					goalId={goalId}
					onSuccess={handleAddLinkSuccess}
					triggerText="＋ デッキを追加する"
				/>
			</div>

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
