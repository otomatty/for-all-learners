import { getGoalDecks } from "@/app/_actions/goal-decks";
import { createClient } from "@/lib/supabase/server";
import React from "react";
import ClientGoalDecksSection from "./goal-decks-section-client";
import type { Deck as ClientDeck } from "./goal-decks-section-client";

interface GoalDecksSectionProps {
	/** 表示対象の学習目標ID */
	goalId: string;
	/** デッキIDをキーとした期限切れカード数マップ (親から渡される) */
	dueMap: Record<string, number>;
}

/**
 * 目標に紐づくデッキ管理セクションを表示します。
 */
export default async function ServerGoalDecksSection({
	goalId,
	dueMap,
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

	// 目標に紐づくデッキを取得
	const decks = await getGoalDecks(goalId);
	// 親から渡された dueMap を用いて復習対象件数をマージ
	const initialDecks: ClientDeck[] = decks.map((d) => ({
		...d,
		todayReviewCount: dueMap[d.id] ?? 0,
	}));

	return <ClientGoalDecksSection goalId={goalId} initialDecks={initialDecks} />;
}
