import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";

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
	const { data, error } = await supabase.from("decks").insert(deck).single();
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

export async function createDeckAction(formData: FormData) {
	"use server";
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
