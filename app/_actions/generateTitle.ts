"use server";

import { createClientWithUserKey } from "@/lib/llm/factory";

/**
 * Generate a concise Japanese title (5-20 characters) from a transcript text
 * @param transcript - the transcription text to summarize
 */
export async function generateTitleFromTranscript(
	transcript: string,
): Promise<string> {
	const systemPrompt =
		"この文章を5文字〜20文字程度の日本語タイトルに要約してください。";

	// Create dynamic LLM client
	const client = await createClientWithUserKey({ provider: "google" });

	// Generate title using LLM
	const prompt = `${systemPrompt}\n\n${transcript}`;
	const response = await client.generate(prompt);

	// Remove code fences or extra formatting
	const title = response.replace(/```(?:json)?[\s\S]*?```/g, "").trim();
	return title;
}
