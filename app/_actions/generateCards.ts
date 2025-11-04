"use server";

import type { LLMProvider } from "@/lib/llm/client";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { buildPrompt } from "@/lib/llm/prompt-builder";
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
 *   ├─ lib/llm/factory.ts (createClientWithUserKey)
 *   ├─ lib/llm/prompt-builder.ts (buildPrompt)
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

	logger.info(
		{ provider, transcriptLength: transcript.length, model: options?.model },
		"Starting card generation from transcript",
	);

	// System prompt guiding the model to output JSON array of cards
	const systemPrompt =
		"以下の文字起こしから、問題文 (front_content) と回答 (back_content) のペアをJSON配列で生成してください。";

	// Build prompt string
	const prompt = buildPrompt([systemPrompt, transcript]);

	// Create LLM client dynamically (auto-fetches user API key)
	const client = await createClientWithUserKey({
		provider,
		model: options?.model,
	});

	logger.info(
		{ provider, model: options?.model },
		"Calling LLM for card generation",
	);

	// Call LLM API (provider-agnostic)
	const response = await client.generate(prompt);

	// Response is already a simple string
	if (!response || response.trim().length === 0) {
		throw new Error("カード生成に失敗しました: 内容が空です");
	}

	let jsonString = response;

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
