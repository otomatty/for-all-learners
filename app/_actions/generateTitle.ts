"use server";

import { getGeminiClient } from "@/lib/gemini/client";
import { createUserContent } from "@google/genai";

interface GenerateTitleResponse {
	candidates?: { content: string }[];
}

/**
 * Generate a concise Japanese title (5-20 characters) from a transcript text
 * @param transcript - the transcription text to summarize
 */
export async function generateTitleFromTranscript(
	transcript: string,
): Promise<string> {
	const systemPrompt =
		"この文章を5文字〜20文字程度の日本語タイトルに要約してください。";
	const contents = createUserContent([systemPrompt, transcript]);
	const geminiClient = getGeminiClient();
	const response = await geminiClient.models.generateContent({
		model: "gemini-2.5-flash",
		contents,
	});
	// Extract raw content
	const { candidates } = response as unknown as GenerateTitleResponse;
	const raw = candidates?.[0]?.content ?? "";
	let title = typeof raw === "string" ? raw : String(raw);
	// Remove code fences or extra formatting
	title = title.replace(/```(?:json)?[\s\S]*?```/g, "").trim();
	return title;
}
