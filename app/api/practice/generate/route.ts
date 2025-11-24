/**
 * Practice Question Generation API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ components/practice/* (練習問題UI)
 *   └─ app/(protected)/practice/page.tsx
 *
 * Dependencies (依存先):
 *   ├─ lib/gemini.ts (generateQuestions)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Files:
 *   ├─ Spec: ./route.spec.md
 *   └─ Tests: ./__tests__/route.test.ts
 */

import { type NextRequest, NextResponse } from "next/server";
import { generateQuestions, type QuestionType } from "@/lib/gemini";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

type LLMProvider = "google" | "openai" | "anthropic";

interface GeneratePracticeRequest {
	cardIds: string[];
	type: QuestionType;
	provider?: LLMProvider;
	model?: string;
}

export async function POST(request: NextRequest) {
	let cardIds: string[] | undefined;
	let type: QuestionType | undefined;
	let provider: LLMProvider | undefined;
	let model: string | undefined;

	try {
		({ cardIds, type, provider, model } =
			(await request.json()) as GeneratePracticeRequest);

		// Validation: cardIds and type are required
		if (!cardIds || !type) {
			return NextResponse.json(
				{ error: "cardIds and type are required" },
				{ status: 400 },
			);
		}

		// Validation: cardIds must not be empty
		if (cardIds.length === 0) {
			return NextResponse.json(
				{ error: "cardIds must not be empty" },
				{ status: 400 },
			);
		}

		// Validation: provider must be valid (if specified)
		if (provider && !["google", "openai", "anthropic"].includes(provider)) {
			return NextResponse.json(
				{
					error: "Invalid provider. Must be one of: google, openai, anthropic",
				},
				{ status: 400 },
			);
		}

		logger.info(
			{
				cardCount: cardIds.length,
				type,
				provider: provider || "google",
				model: model || "default",
			},
			"Starting practice question generation",
		);

		const supabase = await createClient();
		const { data: cards, error } = await supabase
			.from("cards")
			.select("id, front_content, back_content")
			.in("id", cardIds);

		if (error || !cards) {
			return NextResponse.json(
				{ error: error?.message ?? "Failed to fetch cards" },
				{ status: 500 },
			);
		}

		const questions = await Promise.all(
			cards.map(async (card) => {
				logger.info(
					{ cardId: card.id, provider: provider || "google" },
					"Generating question for card",
				);

				const qData = await generateQuestions(
					card.front_content as string,
					card.back_content as string,
					type as QuestionType,
					"normal", // difficulty
					provider || model ? { provider, model } : undefined,
				);

				return {
					cardId: card.id,
					question: qData,
				};
			}),
		);

		logger.info(
			{ cardCount: questions.length },
			"Practice question generation completed",
		);

		return NextResponse.json({ questions });
	} catch (err: unknown) {
		logger.error(
			{
				cardIds,
				type,
				provider: provider || "google",
				error: err instanceof Error ? err.message : String(err),
			},
			"Failed to generate practice questions",
		);

		if (err instanceof Error) {
			return NextResponse.json({ error: err.message }, { status: 500 });
		}
		return NextResponse.json(
			{ error: "An unknown error occurred" },
			{ status: 500 },
		);
	}
}
