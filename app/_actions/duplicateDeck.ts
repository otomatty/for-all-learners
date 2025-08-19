"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type DuplicateDeckParams = {
	originalDeckId: string;
	/** 複製後のデッキタイトル（指定されない場合は元のタイトル + " copy"） */
	newTitle?: string;
};

/**
 * デッキを複製します（カードも含めて）。
 * @param params 複製パラメータ
 * @returns 複製されたデッキの情報
 */
export async function duplicateDeck({
	originalDeckId,
	newTitle,
}: DuplicateDeckParams): Promise<Database["public"]["Tables"]["decks"]["Row"]> {
	const supabase = await createClient();

	// ユーザー認証チェック
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		throw new Error("認証が必要です");
	}

	// 元のデッキデータを取得
	const { data: originalDeck, error: originalError } = await supabase
		.from("decks")
		.select("*")
		.eq("id", originalDeckId)
		.single();

	if (originalError || !originalDeck) {
		throw originalError || new Error("元のデッキが見つかりません");
	}

	// ユーザーが元のデッキの所有者であるかチェック
	if (originalDeck.user_id !== user.id) {
		throw new Error("このデッキを複製する権限がありません");
	}

	// 複製デッキのタイトルを決定
	const duplicateTitle = newTitle || `${originalDeck.title} copy`;

	// 新しいデッキを作成
	const { data: newDeck, error: createError } = await supabase
		.from("decks")
		.insert({
			user_id: originalDeck.user_id,
			title: duplicateTitle,
			description: originalDeck.description,
			is_public: originalDeck.is_public,
		})
		.select("*")
		.single();

	if (createError || !newDeck) {
		throw createError || new Error("デッキの複製に失敗しました");
	}

	// 元のデッキのカードを取得
	const { data: originalCards, error: cardsError } = await supabase
		.from("cards")
		.select("*")
		.eq("deck_id", originalDeckId);

	if (cardsError) {
		throw cardsError;
	}

	// カードも複製
	if (originalCards && originalCards.length > 0) {
		const cardInserts = originalCards.map((card) => ({
			deck_id: newDeck.id,
			user_id: card.user_id,
			front_content: card.front_content,
			back_content: card.back_content,
			// FSRSパラメータは初期化（新しい学習として扱う）
			due: new Date().toISOString(),
			stability: 1,
			difficulty: 10,
			elapsed_days: 0,
			scheduled_days: 1,
			reps: 0,
			lapses: 0,
			state: "new" as const,
			last_review: null,
		}));

		const { error: insertCardsError } = await supabase
			.from("cards")
			.insert(cardInserts);

		if (insertCardsError) {
			// デッキは作成済みなので、エラーの場合はデッキも削除
			await supabase.from("decks").delete().eq("id", newDeck.id);
			throw insertCardsError;
		}
	}

	return newDeck;
}
