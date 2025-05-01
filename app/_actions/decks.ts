"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";
import { syncCardLinks } from "@/app/_actions/syncCardLinks";
import type { JSONContent } from "@tiptap/core";

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
	const { data, error } = await supabase
		.from("decks")
		.delete()
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
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
		// Revalidate decks page
		revalidatePath("/decks");
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
