import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { Deck as ClientDeck } from "./GoalDecksSectionClient";
import ClientGoalDecksSection from "./GoalDecksSectionClient";

type Deck = Database["public"]["Tables"]["decks"]["Row"] & {
	card_count?: number;
};

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
	const _userId = user.id;

	// 目標に紐づくデッキを取得
	const { data: goalDeckLinks, error: linksError } = await supabase
		.from("goal_deck_links")
		.select("decks(*), card_count:cards(count)")
		.eq("goal_id", goalId);

	if (linksError) throw linksError;

	// Transform the data structure
	const decks: Deck[] = (goalDeckLinks || []).map((link: any) => ({
		...link.decks,
		card_count: link.card_count?.[0]?.count || 0,
	})) as Deck[];

	// 親から渡された dueMap を用いて復習対象件数をマージ
	const initialDecks: ClientDeck[] = decks.map((d) => ({
		...d,
		todayReviewCount: dueMap[d.id] ?? 0,
	}));

	return <ClientGoalDecksSection goalId={goalId} initialDecks={initialDecks} />;
}
