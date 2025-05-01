import { geminiClient } from "@/lib/gemini/client";

export type QuestionType = "flashcard" | "multiple_choice" | "cloze";

export interface FlashcardQuestion {
	/** 質問タイプ */
	type: "flashcard";
	question: string;
	prompt: string;
	answer: string;
}

export interface MultipleChoiceQuestion {
	/** 質問タイプ */
	type: "multiple_choice";
	prompt: string;
	question: string;
	options: string[];
	correctAnswerIndex: number;
	explanation: string;
}

export interface ClozeQuestion {
	/** 質問タイプ */
	type: "cloze";
	text: string;
	blanks: string[];
	question: string;
	answers: string[];
}

export type QuestionData =
	| FlashcardQuestion
	| MultipleChoiceQuestion
	| ClozeQuestion;

/**
 * Generate question data using the Google GenAI client.
 * @param front - The front content of the flashcard.
 * @param back - The back content of the flashcard.
 * @param type - The type of question to generate (flashcard, multiple_choice, cloze).
 * @param difficulty - The difficulty of the question (easy, normal, hard).
 * @returns Parsed JSON object representing the generated question data.
 */
export async function generateQuestions(
	front: string,
	back: string,
	type: QuestionType,
	difficulty: "easy" | "normal" | "hard" = "normal",
): Promise<QuestionData> {
	// Add difficulty info to the prompt
	const difficultyPrompt = ` (Difficulty: ${difficulty})`;

	// Prefix to enforce pure JSON output
	const JSON_ONLY_PREFIX =
		"Return only valid JSON without markdown fences or extra text.\n";

	// Build prompt based on question type
	let prompt: string;
	switch (type) {
		case "multiple_choice":
			prompt = `${JSON_ONLY_PREFIX}Generate a multiple-choice question${difficultyPrompt} based on the following flashcard. Provide a JSON object with these keys:
"prompt" (string),
"question" (string, the question text),
"options" (array of 4 strings),
"correctAnswerIndex" (integer index of the correct option),
"explanation" (string explanation for the correct answer).
Ensure valid JSON only, no markdown fences.
Front: ${front}
Back: ${back}`;
			break;
		case "cloze":
			prompt = `${JSON_ONLY_PREFIX}Generate a cloze (fill-in-the-blank) question${difficultyPrompt} based on the following flashcard. Provide a JSON object with these keys:
"text" (string, include blank placeholders in curly braces),
"blanks" (array of strings, each placeholder including curly braces),
"answers" (array of strings for each blank without braces).
Ensure valid JSON only, no markdown fences.
Front: ${front}
Back: ${back}`;
			break;
		default:
			prompt = `${JSON_ONLY_PREFIX}Generate a simple flashcard question${difficultyPrompt} based on the following flashcard. Provide a JSON object with these keys:
"prompt" (string),
"answer" (string).
Ensure valid JSON only, no markdown fences.
Front: ${front}
Back: ${back}`;
			break;
	}

	// Use Google GenAI SDK client to generate content
	const apiResponse = await geminiClient.models.generateContent({
		model: process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-04-17",
		contents: prompt,
	});
	const content = apiResponse.text;
	if (!content) {
		throw new Error("Empty response from Gemini client");
	}

	// Clean up content: extract JSON inside markdown fences if present
	let jsonStr: string;
	const fenceMatch = content.match(/```json\s*([\s\S]*?)```/i);
	if (fenceMatch?.[1]) {
		jsonStr = fenceMatch[1].trim();
	} else {
		// Fallback: extract between first { and last }
		const match = content.match(/\{[\s\S]*\}$/);
		jsonStr = match ? match[0].trim() : content.trim();
	}
	// Remove any trailing commas before closing braces/brackets
	jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
	console.debug("Cleaned JSON from Gemini:", jsonStr);

	try {
		const parsed = JSON.parse(jsonStr) as Omit<QuestionData, "type">;
		return { type, ...parsed } as QuestionData;
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to parse Gemini response JSON: ${msg}`);
	}
}

/**
 * Generate multiple questions in batch using Google GenAI client.
 * @param pairs - Array of objects containing front and back text.
 * @param type - Question type (flashcard, multiple_choice, cloze).
 * @param difficulty - Difficulty (easy, normal, hard).
 * @returns Array of parsed question data.
 */
export async function generateBulkQuestions(
	pairs: { front: string; back: string }[],
	type: QuestionType,
	difficulty: "easy" | "normal" | "hard" = "normal",
): Promise<QuestionData[]> {
	// Prefix to enforce pure JSON output
	const JSON_ONLY_PREFIX =
		"Respond with ONLY a valid JSON array including commas between objects. No markdown fences or extra text.\n";
	// Difficulty prompt
	const difficultyPrompt = ` (Difficulty: ${difficulty})`;
	// Question descriptor
	const typeName =
		type === "multiple_choice"
			? "multiple-choice"
			: type === "cloze"
				? "cloze"
				: "flashcard";

	// Build batch prompt with explicit JSON structure per type
	let header: string;
	switch (type) {
		case "multiple_choice":
			header = `${JSON_ONLY_PREFIX}Generate an array of ${pairs.length} multiple-choice questions${difficultyPrompt} based on the following flashcards. Provide ONLY a JSON array of objects, each with keys:
"prompt" (string),
"question" (string),
"options" (array of 4 strings),
"correctAnswerIndex" (integer),
"explanation" (string).
Use valid JSON array only.\n`;
			break;
		case "cloze":
			header = `${JSON_ONLY_PREFIX}Generate an array of ${pairs.length} cloze (fill-in-the-blank) questions${difficultyPrompt} based on the following flashcards. Provide ONLY a JSON array of objects, each with keys:
"text" (string, include blank placeholders in curly braces),
"blanks" (array of strings, each placeholder including curly braces),
"answers" (array of strings for each blank without braces).
Use valid JSON array only.\n`;
			break;
		default:
			header = `${JSON_ONLY_PREFIX}Generate an array of ${pairs.length} flashcard questions${difficultyPrompt} based on the following flashcards. Provide ONLY a JSON array of objects, each with keys:
"prompt" (string),
"answer" (string).
Use valid JSON array only.\n`;
			break;
	}
	const contentText = pairs
		.map((p, i) => `Flashcard ${i + 1}:\nFront: ${p.front}\nBack: ${p.back}`)
		.join("\n\n");
	const prompt = `${header}${contentText}`;

	// Call Gemini once for all cards
	const apiResponse = await geminiClient.models.generateContent({
		model: process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-04-17",
		contents: prompt,
	});
	const raw = apiResponse.text;
	console.debug("Raw Gemini bulk response:", raw);
	if (!raw) throw new Error("Empty response from Gemini client");

	// Extract JSON array
	let jsonStr: string;
	const fenceMatch = raw.match(/```json\s*([\s\S]*?)```/i);
	if (fenceMatch?.[1]) {
		jsonStr = fenceMatch[1].trim();
	} else {
		const arrMatch = raw.match(/\[[\s\S]*\]/);
		jsonStr = arrMatch ? arrMatch[0] : raw.trim();
	}
	// Remove trailing commas
	jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");
	// Correct missing commas between objects if model output glued them together
	jsonStr = jsonStr.replace(/}\s*{/g, "},{");
	console.debug("Cleaned bulk JSON string:", jsonStr);

	try {
		const arr = JSON.parse(jsonStr) as Array<Omit<QuestionData, "type">>;
		return arr.map((q) => ({ type, ...q }) as QuestionData);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to parse bulk response JSON: ${msg}`);
	}
}
