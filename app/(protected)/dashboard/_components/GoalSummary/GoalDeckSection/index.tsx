import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import ClientGoalDecksSection, {
	type DeckWithReviewCount,
} from "./GoalDecksSectionClient";

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
	// Note: cards count is fetched through the decks relationship since goal_deck_links doesn't have a direct FK to cards
	const { data: goalDeckLinks, error: linksError } = await supabase
		.from("goal_deck_links")
		.select("decks(*, cards(count))")
		.eq("goal_id", goalId);

	if (linksError) throw linksError;

	// Transform the data structure
	const decks: Deck[] = (goalDeckLinks || []).map((link: any) => ({
		...link.decks,
		card_count: link.decks?.cards?.[0]?.count || 0,
	})) as Deck[];

	// 親から渡された dueMap を用いて復習対象件数をマージ
	const initialDecks: DeckWithReviewCount[] = decks.map((d) => ({
		...d,
		card_count: d.card_count ?? 0,
		description: d.description ?? "",
		is_public: d.is_public ?? false,
		todayReviewCount: dueMap[d.id] ?? 0,
	}));

	return <ClientGoalDecksSection goalId={goalId} initialDecks={initialDecks} />;
}
