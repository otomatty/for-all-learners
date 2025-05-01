import React from "react";
import {
	getGoalDecks,
	getDeckStudyLogs,
	type Deck,
	type DeckStudyLog,
} from "@/app/_actions/goal-decks";
import ClientGoalDecksSection from "./goal-decks-section-client";

interface GoalDecksSectionProps {
	goalId: string;
}

/**
 * 目標に紐づくデッキ管理セクションを表示します。
 */
export default async function ServerGoalDecksSection({
	goalId,
}: GoalDecksSectionProps) {
	const decks: Deck[] = await getGoalDecks(goalId);
	const logs: DeckStudyLog[] = await getDeckStudyLogs(goalId);
	return (
		<ClientGoalDecksSection
			goalId={goalId}
			initialDecks={decks}
			initialLogs={logs}
		/>
	);
}
