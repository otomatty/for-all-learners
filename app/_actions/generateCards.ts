"use server";

import { createUserContent } from "@google/genai";
import { geminiClient } from "@/lib/gemini/client";

export interface GeneratedCard {
	front_content: string;
	back_content: string;
	source_audio_url: string;
}

/**
 * Server action to generate flashcard Q&A pairs from a transcript.
 */
export async function generateCardsFromTranscript(
	transcript: string,
	sourceAudioUrl: string,
): Promise<GeneratedCard[]> {
	// System prompt guiding the model to output JSON array of cards
	const systemPrompt =
		"以下の文字起こしから、問題文 (front_content) と回答 (back_content) のペアをJSON配列で生成してください。";

	// Build contents for Gemini
	const contents = createUserContent([systemPrompt, transcript]);

	// Call Gemini API
	const response = await geminiClient.models.generateContent({
		model: "gemini-2.5-flash",
		contents,
	});

	// Extract raw content
	const { candidates } = response as unknown as {
		candidates?: { content: { parts: { text: string }[] } }[];
	};
	const raw = candidates?.[0]?.content;
	if (!raw) {
		throw new Error("カード生成に失敗しました: 内容が空です");
	}

	// Combine parts if needed
	let jsonString: string;
	if (typeof raw === "string") {
		jsonString = raw;
	} else if (typeof raw === "object" && Array.isArray(raw.parts)) {
		jsonString = raw.parts.map((p: { text: string }) => p.text).join("");
	} else {
		jsonString = String(raw);
	}

	// Attempt to extract JSON block between code fences
	const fencePattern = /```(?:json)?\s*?\n([\s\S]*?)```/;
	const fenceMatch = jsonString.match(fencePattern);
	if (fenceMatch) {
		jsonString = fenceMatch[1].trim();
	} else {
		// Fallback: extract content between first '[' and last ']'
		const start = jsonString.indexOf("[");
		const end = jsonString.lastIndexOf("]");
		if (start !== -1 && end !== -1 && end > start) {
			jsonString = jsonString.slice(start, end + 1);
		}
	}

	// Parse JSON
	let parsed: { front_content: string; back_content: string }[];
	try {
		parsed = JSON.parse(jsonString);
	} catch (e) {
		console.error("JSON解析エラー:", e, jsonString);
		throw new Error("カード生成結果の解析に失敗しました");
	}

	// Map to GeneratedCard format
	return (parsed as { front_content: string; back_content: string }[]).map(
		(c) => ({
			front_content: c.front_content,
			back_content: c.back_content,
			source_audio_url: sourceAudioUrl,
		}),
	);
}
