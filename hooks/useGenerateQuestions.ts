import type { QuestionData, QuestionType } from "@/lib/gemini";
import { useEffect, useState } from "react";

/**
 * The response structure for a generated question.
 */
interface QuestionResponse {
	cardId: string;
	question: QuestionData;
}

/**
 * The return type of the useGenerateQuestions hook.
 */
interface UseGenerateQuestionsResult {
	/** Array of generated questions or null if not yet loaded */
	questions: QuestionResponse[] | null;
	/** Loading flag while fetching questions */
	isLoading: boolean;
	/** Error object if fetch failed */
	error: Error | null;
}

/**
 * Custom hook to generate practice questions via the API.
 * @param cardIds - Array of card IDs to generate questions for.
 * @param type - The format of questions to generate (flashcard, multiple_choice, cloze).
 * @returns An object containing questions, loading state, and any error.
 */
export function useGenerateQuestions(
	cardIds: string[] | null,
	type: QuestionType,
): UseGenerateQuestionsResult {
	const [questions, setQuestions] = useState<QuestionResponse[] | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		// Only fetch when cardIds are provided
		if (!cardIds || cardIds.length === 0) {
			setQuestions(null);
			return;
		}

		setIsLoading(true);
		setError(null);

		fetch("/api/practice/generate", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ cardIds, type }),
		})
			.then(async (res) => {
				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Failed to generate questions");
				}
				return data.questions as QuestionResponse[];
			})
			.then((qs) => {
				setQuestions(qs);
			})
			.catch((err: Error) => {
				setError(err);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [cardIds, type]);

	return { questions, isLoading, error };
}
