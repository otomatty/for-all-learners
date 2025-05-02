"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Deck = {
	id: string;
	title: string;
	card_count: number;
	description: string;
	is_public: boolean;
};
export type DeckStudyLog = { deck: { title: string }; studied_at: string };

/**
 * Fetch decks associated with a study goal and count their cards.
 */
export async function getGoalDecks(goalId: string): Promise<Deck[]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("goal_deck_links")
		.select("decks(id, title, description, is_public, cards(id))")
		.eq("goal_id", goalId);

	if (error) {
		throw error;
	}
	return (data || []).map((row) => ({
		id: row.decks.id,
		title: row.decks.title,
		card_count: row.decks.cards?.length ?? 0,
		description: row.decks.description ?? "",
		is_public: row.decks.is_public ?? false,
	}));
}

/**
 * Link a deck to a study goal.
 */
export async function addGoalDeckLink(
	goalId: string,
	deckId: string,
): Promise<void> {
	const supabase = await createClient();
	const { error } = await supabase
		.from("goal_deck_links")
		.insert({ goal_id: goalId, deck_id: deckId });

	if (error) {
		throw new Error(`Failed to link deck: ${error.message}`);
	}
	revalidatePath("/dashboard");
}

/**
 * Remove a deck link from a study goal.
 */
export async function removeGoalDeckLink(
	goalId: string,
	deckId: string,
): Promise<void> {
	const supabase = await createClient();
	const { error } = await supabase
		.from("goal_deck_links")
		.delete()
		.eq("goal_id", goalId)
		.eq("deck_id", deckId);

	if (error) {
		throw new Error(`Failed to remove link: ${error.message}`);
	}
	revalidatePath("/dashboard");
}

/**
 * Fetch study logs for all decks linked to a study goal.
 */
export async function getDeckStudyLogs(
	goalId: string,
): Promise<DeckStudyLog[]> {
	const supabase = await createClient();
	// Get linked deck IDs
	const { data: links, error: linkError } = await supabase
		.from("goal_deck_links")
		.select("deck_id")
		.eq("goal_id", goalId);

	if (linkError) {
		throw linkError;
	}
	const deckIds = (links || []).map((l) => l.deck_id);
	if (deckIds.length === 0) {
		return [];
	}

	const { data, error } = await supabase
		.from("deck_study_logs")
		.select("deck:decks(title), studied_at")
		.in("deck_id", deckIds)
		.order("studied_at", { ascending: false });

	if (error) {
		throw error;
	}
	return data as DeckStudyLog[];
}

/**
 * Record a study session for a deck.
 */
export async function addDeckStudyLog(
	deckId: string,
	studiedAt: string,
): Promise<void> {
	const supabase = await createClient();

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		throw new Error(authError?.message || "Not authenticated");
	}

	const { error } = await supabase
		.from("deck_study_logs")
		.insert({ user_id: user.id, deck_id: deckId, studied_at: studiedAt });

	if (error) {
		throw new Error(`Failed to add study log: ${error.message}`);
	}
	revalidatePath("/dashboard");
}

/**
 * Fetch decks not yet linked to the specified study goal for the authenticated user.
 */
export async function getAvailableDecksForGoal(
	goalId: string,
): Promise<Deck[]> {
	const supabase = await createClient();
	// Get authenticated user
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		throw new Error(authError?.message || "Not authenticated");
	}
	// Get linked deck IDs for this goal
	const { data: links, error: linksError } = await supabase
		.from("goal_deck_links")
		.select("deck_id")
		.eq("goal_id", goalId);
	if (linksError) {
		throw linksError;
	}
	const linkedIds = (links || []).map((l) => l.deck_id);
	// Fetch user's decks not linked
	let query = supabase
		.from("decks")
		.select("id, title, description, is_public, cards(id)")
		.eq("user_id", user.id);
	if (linkedIds.length > 0) {
		// exclude linked decks
		query = query.not("id", "in", `(${linkedIds.join(",")})`);
	}
	const { data: decksData, error: decksError } = await query;
	if (decksError) {
		throw decksError;
	}
	return (decksData || []).map((d) => ({
		id: d.id,
		title: d.title,
		card_count: d.cards?.length ?? 0,
		description: d.description ?? "",
		is_public: d.is_public ?? false,
	}));
}
