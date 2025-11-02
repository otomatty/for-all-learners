"use server";

import { createUserContent } from "@google/genai";
import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
import { geminiClient } from "@/lib/gemini/client";
import type { LLMProvider } from "@/lib/llm/client";
import logger from "@/lib/logger";

/**
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ app/_actions/audioBatchProcessing.ts
 *   ├─ app/(protected)/decks/[deckId]/_components/audio-card-generator.tsx
 *   └─ app/(protected)/decks/[deckId]/_components/image-card-generator.tsx
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/ai/getUserAPIKey.ts
 *   ├─ lib/gemini/client.ts
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./generateCards.spec.md
 *   ├─ Tests: ./__tests__/generateCards.test.ts
 *   └─ Plan: docs/03_plans/phase-1-ai-integration/20251102_02_day3-generatecards-integration-plan.md
 */

export interface GeneratedCard {
	front_content: string;
	back_content: string;
	source_audio_url: string;
}

interface GenerateCardsOptions {
	provider?: LLMProvider;
	model?: string;
}

/**
 * Server action to generate flashcard Q&A pairs from a transcript.
 *
 * @param transcript - Audio transcription text
 * @param sourceAudioUrl - Audio file URL
 * @param options - Generation options
 * @param options.provider - LLM provider ("google" | "openai" | "anthropic", default: "google")
 * @param options.model - Custom model name (optional)
 * @returns Array of generated flashcards
 * @throws Error if transcript is empty
 * @throws Error if API key is not configured
 *
 * @example
 * ```typescript
 * // Google Gemini でカード生成
 * const cards = await generateCardsFromTranscript(transcript, audioUrl);
 *
 * // OpenAI でカード生成
 * const cards = await generateCardsFromTranscript(transcript, audioUrl, { provider: "openai" });
 * ```
 */
export async function generateCardsFromTranscript(
	transcript: string,
	sourceAudioUrl: string,
	options?: GenerateCardsOptions,
): Promise<GeneratedCard[]> {
	// Input validation
	if (!transcript.trim()) {
		throw new Error("トランスクリプトが空です");
	}

	// Determine provider
	const provider = (options?.provider || "google") as LLMProvider;

	// Get API key
	logger.info(
		{ provider, transcriptLength: transcript.length },
		"Starting card generation from transcript",
	);

	const apiKey = await getUserAPIKey(provider);

	logger.info(
		{ provider, hasApiKey: !!apiKey },
		"API key retrieved for card generation",
	);
	// System prompt guiding the model to output JSON array of cards
	const systemPrompt =
		"以下の文字起こしから、問題文 (front_content) と回答 (back_content) のペアをJSON配列で生成してください。";

	// Build contents for Gemini
	const contents = createUserContent([systemPrompt, transcript]);

	// Call Gemini API (currently Google Gemini only, future: multi-provider support)
	logger.info(
		{ provider, model: options?.model || "gemini-2.5-flash" },
		"Calling LLM for card generation",
	);

	const response = await geminiClient.models.generateContent({
		model: options?.model || "gemini-2.5-flash",
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
	} catch (_e) {
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
