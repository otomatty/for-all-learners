"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

/**
 * Insert a new audio transcription record.
 */
export async function createAudioTranscription(
	transcription: Omit<
		Database["public"]["Tables"]["audio_transcriptions"]["Insert"],
		"id"
	>,
): Promise<Database["public"]["Tables"]["audio_transcriptions"]["Row"]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("audio_transcriptions")
		.insert(transcription)
		.select()
		.single();
	if (error) throw error;
	if (!data) throw new Error("createAudioTranscription: no data returned");
	return data;
}

/**
 * Fetch all audio transcriptions for a given user.
 */
export async function getAudioTranscriptionsByUser(
	userId: string,
): Promise<Database["public"]["Tables"]["audio_transcriptions"]["Row"][]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("audio_transcriptions")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });
	if (error) throw error;
	return data;
}

/**
 * Fetch all audio transcriptions for a given deck.
 */
export async function getAudioTranscriptionsByDeck(
	deckId: string,
): Promise<Database["public"]["Tables"]["audio_transcriptions"]["Row"][]> {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("audio_transcriptions")
		.select("*")
		.eq("deck_id", deckId)
		.order("created_at", { ascending: false });
	if (error) throw error;
	return data;
}
