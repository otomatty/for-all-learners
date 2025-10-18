"use server";

import type { JSONContent } from "@tiptap/core";
import { revalidatePath } from "next/cache";
import { syncCardLinks } from "@/app/_actions/syncCardLinks";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export async function getDecksByUser(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("decks")
		.select("*")
		.eq("user_id", userId);
	if (error) throw error;
	return data;
}

export async function getDeckById(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("decks")
		.select("*")
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function createDeck(
	deck: Omit<Database["public"]["Tables"]["decks"]["Insert"], "id">,
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("decks")
		.insert(deck)
		.select()
		.single();
	if (error) {
		console.error("createDeck error:", error);
		// Supabase error message forwarded to user
		throw new Error(`デッキの作成に失敗しました: ${error.message}`);
	}
	return data;
}

export async function updateDeck(
	id: string,
	updates: Database["public"]["Tables"]["decks"]["Update"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("decks")
		.update(updates)
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function deleteDeck(id: string) {
	const supabase = await createClient();

	try {
		// 関連データを正しい順序で削除

		// 1. カードの削除
		const { error: cardsError } = await supabase
			.from("cards")
			.delete()
			.eq("deck_id", id);

		if (cardsError) {
			throw new Error(`カードの削除に失敗しました: ${cardsError.message}`);
		}

		// 2. 目標デッキリンクの削除
		const { error: goalLinksError } = await supabase
			.from("goal_deck_links")
			.delete()
			.eq("deck_id", id);

		if (goalLinksError) {
			throw new Error(
				`目標リンクの削除に失敗しました: ${goalLinksError.message}`,
			);
		}

		// 3. ノートデッキリンクの削除
		const { error: noteLinksError } = await supabase
			.from("note_deck_links")
			.delete()
			.eq("deck_id", id);

		if (noteLinksError) {
			throw new Error(
				`ノートリンクの削除に失敗しました: ${noteLinksError.message}`,
			);
		}

		// 4. 共有情報の削除
		const { error: sharesError } = await supabase
			.from("deck_shares")
			.delete()
			.eq("deck_id", id);

		if (sharesError) {
			throw new Error(`共有情報の削除に失敗しました: ${sharesError.message}`);
		}

		// 5. 学習ログの削除
		const { error: studyLogsError } = await supabase
			.from("deck_study_logs")
			.delete()
			.eq("deck_id", id);

		if (studyLogsError) {
			throw new Error(
				`学習ログの削除に失敗しました: ${studyLogsError.message}`,
			);
		}

		// 6. 音声記録の削除
		const { error: audioError } = await supabase
			.from("audio_transcriptions")
			.delete()
			.eq("deck_id", id);

		if (audioError) {
			throw new Error(`音声記録の削除に失敗しました: ${audioError.message}`);
		}

		// 7. 最後にデッキ本体を削除
		const { data, error: deckError } = await supabase
			.from("decks")
			.delete()
			.eq("id", id)
			.single();

		if (deckError) {
			throw new Error(`デッキの削除に失敗しました: ${deckError.message}`);
		}

		return data;
	} catch (error) {
		console.error("[deleteDeck] エラー:", error);
		throw error;
	}
}

export async function getSharedDecksByUser(userId: string): Promise<
	Array<
		Database["public"]["Tables"]["deck_shares"]["Row"] & {
			decks: Database["public"]["Tables"]["decks"]["Row"];
		}
	>
> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("deck_shares")
		.select("*, decks(*)")
		.eq("shared_with_user_id", userId)
		.order("decks(updated_at)", { ascending: false });
	if (error) throw error;
	return data;
}

/**
 * Server action to create a new deck and revalidate relevant pages.
 * @param formData - フォームデータに含まれるtitleおよびdescription
 * @returns 作成されたデッキのデータ
 */
export async function createDeckAction(
	formData: FormData,
): Promise<Database["public"]["Tables"]["decks"]["Row"]> {
	// Retrieve authenticated user
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error(
			"ログイン情報が取得できませんでした。再度ログインしてください。",
		);
	}
	// Validate and extract form data
	const title = (formData.get("title") as string)?.trim();
	if (!title) {
		throw new Error("タイトルは必須項目です。");
	}
	const description = (formData.get("description") as string) ?? "";
	try {
		const newDeck = await createDeck({ title, description, user_id: user.id });
		// Revalidate decks and dashboard pages
		revalidatePath("/decks");
		revalidatePath("/dashboard");
		return newDeck;
	} catch (err) {
		console.error("createDeckAction error:", err);
		if (err instanceof Error) {
			throw new Error(`デッキの作成中にエラーが発生しました: ${err.message}`);
		}
		throw new Error("デッキの作成中に予期せぬエラーが発生しました。");
	}
}

/**
 * Server action to synchronize page links for all cards in a deck.
 */
export async function syncDeckLinks(deckId: string) {
	const supabase = await createClient();
	// Fetch all cards in the deck
	const { data: cards, error: fetchErr } = await supabase
		.from("cards")
		.select("id, front_content")
		.eq("deck_id", deckId);
	if (fetchErr) throw fetchErr;
	// Sync each card's page links
	for (const card of cards ?? []) {
		const content = card.front_content as JSONContent;
		await syncCardLinks(card.id, content);
	}
	// Revalidate deck page
	revalidatePath(`/decks/${deckId}`);
}
