import type {
	ClozeQuestion,
	FlashcardQuestion,
	MultipleChoiceQuestion,
	QuestionType,
} from "@/lib/gemini";
import { generateQuestions } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export type QuizMode = "one" | "mcq" | "fill";

export interface QuizParams {
	deckId?: string;
	goalId?: string;
	mode: QuizMode;
	count?: number;
	shuffle?: boolean;
}

type QuizQuestion =
	| (MultipleChoiceQuestion & { questionId: string; cardId: string })
	| (FlashcardQuestion & { questionId: string; cardId: string })
	| (ClozeQuestion & { questionId: string; cardId: string });

/**
 * Get quiz questions from deck or goal
 * Extracted from @/app/_actions/quiz (getQuizQuestions)
 */
export async function getQuizQuestionsServer(
	params: QuizParams,
): Promise<QuizQuestion[]> {
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user) {
		throw new Error("Not authenticated");
	}

	// Map mode to QuestionType
	const questionTypeMap: Record<QuizMode, QuestionType> = {
		one: "flashcard",
		mcq: "multiple_choice",
		fill: "cloze",
	};
	const questionType = questionTypeMap[params.mode];

	// Get card IDs from deck or goal
	let cardIds: string[] = [];

	if (params.deckId) {
		// Get cards from deck (cards table has deck_id column)
		const { data: cards, error: cardsError } = await supabase
			.from("cards")
			.select("id")
			.eq("deck_id", params.deckId);

		if (cardsError) throw cardsError;
		cardIds = cards?.map((card) => card.id) || [];
	} else if (params.goalId) {
		// Get cards from goal's decks
		const { data: goalDecks, error: goalDecksError } = await supabase
			.from("goal_deck_links")
			.select("deck_id")
			.eq("goal_id", params.goalId);

		if (goalDecksError) throw goalDecksError;

		const deckIds = goalDecks?.map((gd) => gd.deck_id) || [];
		if (deckIds.length === 0) return [];

		const { data: cards, error: cardsError } = await supabase
			.from("cards")
			.select("id")
			.in("deck_id", deckIds);

		if (cardsError) throw cardsError;
		cardIds = cards?.map((card) => card.id) || [];
	} else {
		throw new Error("deckId or goalId is required");
	}

	// Remove duplicates
	cardIds = [...new Set(cardIds)];

	// Limit count if specified
	if (params.count && cardIds.length > params.count) {
		// Shuffle if requested
		if (params.shuffle) {
			cardIds = cardIds.sort(() => Math.random() - 0.5);
		}
		cardIds = cardIds.slice(0, params.count);
	} else if (params.shuffle) {
		cardIds = cardIds.sort(() => Math.random() - 0.5);
	}

	if (cardIds.length === 0) return [];

	// Get card details
	const { data: cards, error: cardsError } = await supabase
		.from("cards")
		.select("id, front_content, back_content")
		.in("id", cardIds);

	if (cardsError) throw cardsError;
	if (!cards || cards.length === 0) return [];

	// Generate questions for each card
	const questions = await Promise.all(
		cards.map(async (card) => {
			const questionData = await generateQuestions(
				card.front_content as string,
				card.back_content as string,
				questionType,
				"normal",
			);

			// Generate questionId (use cardId + timestamp for uniqueness)
			const questionId = `${card.id}-${Date.now()}-${Math.random()}`;

			return {
				...questionData,
				questionId,
				cardId: card.id,
			} as QuizQuestion;
		}),
	);

	return questions;
}
