import React from "react";
import {
	getGoalDecks,
	getDeckStudyLogs,
	type Deck,
	type DeckStudyLog,
} from "@/app/_actions/goal-decks";
import ClientGoalDecksSection from "./goal-decks-section-client";
import { createClient } from "@/lib/supabase/server";
import { getTodayReviewCountsByDeck } from "@/app/_actions/learning_logs";

interface GoalDecksSectionProps {
	goalId: string;
}

/**
 * 目標に紐づくデッキ管理セクションを表示します。
 */
export default async function ServerGoalDecksSection({
	goalId,
}: GoalDecksSectionProps) {
	// Supabase クライアント作成 & 認証ユーザー取得
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user)
		throw new Error(authError?.message || "Not authenticated");
	const userId = user.id;

	// 目標デッキ、学習ログ、今日のレビュー数を並列取得
	const [decks, logs, todayCounts] = await Promise.all([
		getGoalDecks(goalId),
		getDeckStudyLogs(goalId),
		getTodayReviewCountsByDeck(userId),
	]);

	// デッキごとに今日のレビュー数をマージ
	const initialDecks = decks.map((d) => ({
		...d,
		todayReviewCount:
			todayCounts.find((t) => t.deck_id === d.id)?.review_count ?? 0,
	}));

	return (
		<ClientGoalDecksSection
			goalId={goalId}
			initialDecks={initialDecks}
			initialLogs={logs}
		/>
	);
}
