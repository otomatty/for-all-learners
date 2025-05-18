"use server";

import { createClient } from "@/lib/supabase/server";
import { isUserPaid, getUserPlanFeatures } from "@/app/_actions/subscriptions";
import type { Database } from "@/types/database.types";
import type { QuestionType } from "@/lib/gemini";

export async function getCardsByDeck(deckId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.select("*")
		.eq("deck_id", deckId);
	if (error) throw error;
	return data;
}

export async function getCardById(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.select("*")
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

export async function createCard(
	card: Omit<Database["public"]["Tables"]["cards"]["Insert"], "id">,
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.insert(card)
		.select()
		.single();
	if (error) throw error;
	if (!data) throw new Error("createCard: no data returned");

	// バックグラウンドで問題プリジェネをキック（有料ユーザーのみ）
	try {
		const paid = await isUserPaid(data.user_id);
		if (paid) {
			const features = (await getUserPlanFeatures(data.user_id)) || [];
			// ユーザーのロケール取得
			const { data: settings } = await supabase
				.from("user_settings")
				.select("locale")
				.eq("user_id", data.user_id)
				.single();
			const locale = settings?.locale ?? "ja";
			for (const type of features as QuestionType[]) {
				await supabase.functions.invoke("generate-questions-bg", {
					body: JSON.stringify({
						cardId: data.id,
						type,
						locale,
						userId: data.user_id,
					}),
				});
			}
		}
	} catch (err) {
		console.error("enqueue background generation failed:", err);
	}

	return data;
}

export async function updateCard(
	id: string,
	updates: Database["public"]["Tables"]["cards"]["Update"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.update(updates)
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	if (!data) throw new Error("updateCard: no data returned");

	// バックグラウンドで問題プリジェネをキック（有料ユーザーのみ）
	try {
		const paid = await isUserPaid(data.user_id);
		if (paid) {
			const features = (await getUserPlanFeatures(data.user_id)) || [];
			const { data: settings } = await supabase
				.from("user_settings")
				.select("locale")
				.eq("user_id", data.user_id)
				.single();
			const locale = settings?.locale ?? "ja";
			for (const type of features as QuestionType[]) {
				await supabase.functions.invoke("generate-questions-bg", {
					body: JSON.stringify({
						cardId: data.id,
						type,
						locale,
						userId: data.user_id,
					}),
				});
			}
		}
	} catch (err) {
		console.error("enqueue background generation failed:", err);
	}

	return data;
}

export async function deleteCard(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.delete()
		.eq("id", id)
		.select()
		.single();
	if (error) throw error;
	if (!data) throw new Error("deleteCard: no data returned");
	return data;
}

export async function getCardsByUser(userId: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("cards")
		.select("id")
		.eq("user_id", userId);
	if (error) throw error;
	return data;
}

export async function createCards(
	cards: Array<Omit<Database["public"]["Tables"]["cards"]["Insert"], "id">>,
) {
	const supabase = await createClient();
	const { data, error } = await supabase.from("cards").insert(cards).select();
	if (error) throw error;
	if (!data) throw new Error("createCards: no data returned");
	return data;
}
