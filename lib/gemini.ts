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
	/** 各空欄に対する選択肢の配列。options[i] が answers[i] に対する選択肢群 (正解を含む) */
	options: string[][];
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
"options" (array of 4 strings, ensure all options have roughly the same length),
"correctAnswerIndex" (integer index of the correct option),
"explanation" (string, a detailed explanation in Markdown format of why the correct answer is correct and why the other options are incorrect. Use **bold** for emphasis and - for list items.).
Ensure valid JSON only, no markdown fences.
Front: ${front}
Back: ${back}`;
			break;
		case "cloze":
			prompt = `${JSON_ONLY_PREFIX}Generate a cloze (fill-in-the-blank) question${difficultyPrompt} based on the following flashcard. The question should require understanding of the flashcard content, not just be guessable from context. Provide a JSON object with these keys:
"text" (string, the cloze text with placeholders like {blank1}),
"blanks" (array of strings, listing all blank placeholders like ["{blank1}", "{blank2}"]. This field is mandatory. If there are no blanks, return an empty array \\\`[]\\\`. ),
"question" (string, a question that guides the user to fill the blanks),
"answers" (array of strings for each blank),
"options" (array of arrays of strings. Each inner array should contain 4 options for the corresponding blank, including the correct answer. Ensure options are relevant and plausible yet distinguishable from the correct answer. Shuffle the options for each blank.).
Ensure valid JSON only, no markdown fences.
Front: ${front}
Back: ${back}`;
			break;
		default:
			prompt = `${JSON_ONLY_PREFIX}Generate a simple flashcard question${difficultyPrompt} based on the following flashcard. Provide a JSON object with these keys:
"question" (string, the question to ask),
"answer" (string, the answer to the question).
Ensure valid JSON only, no markdown fences.
Front: ${front}
Back: ${back}`;
			break;
	}

	// Use Google GenAI SDK client to generate content
	const apiResponse = await geminiClient.models.generateContent({
		model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
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

	try {
		const parsed = JSON.parse(jsonStr) as Omit<QuestionData, "type">;
		if (type === "cloze") {
			const clozeQuestion = parsed as ClozeQuestion;
			if (!clozeQuestion.blanks || !Array.isArray(clozeQuestion.blanks)) {
				clozeQuestion.blanks = [];
				console.warn(
					"[gemini.ts] generateQuestions: 'blanks' field was missing or not an array, defaulted to []. Problematic parsed data:",
					JSON.stringify(parsed),
				);
			}
		}
		return { type, ...parsed } as QuestionData;
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to parse Gemini response JSON: ${msg}`);
	}
}

/**
 * Generate multiple questions in batch using Google GenAI client in specified locale.
 * @param pairs - Array of objects containing front and back text.
 * @param type - Question type (flashcard, multiple_choice, cloze).
 * @param difficulty - Difficulty (easy, normal, hard).
 * @param locale - Locale code for language (e.g., 'en', 'ja'). Defaults to 'en'.
 * @returns Array of parsed question data.
 */
export async function generateBulkQuestions(
	pairs: { front: string; back: string }[],
	type: QuestionType,
	locale = "en",
): Promise<QuestionData[]> {
	// Prefix to enforce pure JSON output
	const JSON_ONLY_PREFIX =
		"Respond with ONLY a valid JSON array including commas between objects. No markdown fences or extra text.\n";
	// Difficulty and language prompts
	const languagePrompt = ` (Language: ${locale})`;
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
			header = `${JSON_ONLY_PREFIX}Generate an array of ${pairs.length} multiple-choice questions${languagePrompt} based on the following flashcards. Use exactly this Japanese question template, replacing {prompt} with the prompt text:
""{prompt}" の内容を最もよく表している選択肢はどれですか？"

Avoid any vague pronouns such as "上記の説明" or "それ". Provide ONLY a JSON array of objects, each with keys:
"prompt" (string),
"question" (string),
"options" (array of 4 strings, ensure all options have roughly the same length),
"correctAnswerIndex" (integer),
"explanation" (string, a detailed explanation in Markdown format of why the correct answer is correct and why the other options are incorrect. Use **bold** for emphasis and - for list items.).
Use valid JSON array only.
`;
			break;
		case "cloze":
			header = `${JSON_ONLY_PREFIX}Generate an array of ${pairs.length} cloze (fill-in-the-blank) questions${languagePrompt} based on the following flashcards. Each question should require understanding of the flashcard content, not just be guessable from context. Ensure each question is fully self-contained and avoids vague pronouns such as "this" or "such". Provide ONLY a JSON array of objects, each with keys:
"text" (string, the cloze text with placeholders like {blank1}),
"blanks" (array of strings, listing all blank placeholders like ["{blank1}", "{blank2}"]. This field is mandatory. If there are no blanks, return an empty array \\\`[]\\\`. ),
"question" (string, a question that guides the user to fill the blanks),
"answers" (array of strings for each blank),
"options" (array of arrays of strings. Each inner array should contain 4 options for the corresponding blank, including the correct answer. Ensure options are relevant and plausible yet distinguishable from the correct answer. Shuffle the options for each blank.).
Use valid JSON array only.\\\\n`;
			break;
		default:
			header = `${JSON_ONLY_PREFIX}Generate an array of ${pairs.length} flashcard questions${languagePrompt} based on the following flashcards. Ensure each question is fully self-contained and avoids vague pronouns such as "this" or "such". Provide ONLY a JSON array of objects, each with keys:
"question" (string, the question to ask),
"answer" (string, the answer to the question).
Use valid JSON array only.\n`;
			break;
	}
	const contentText = pairs
		.map((p, i) => `Flashcard ${i + 1}:\nFront: ${p.front}\nBack: ${p.back}`)
		.join("\n\n");
	const prompt = `${header}${contentText}`;

	// Call Gemini once for all cards
	const apiResponse = await geminiClient.models.generateContent({
		model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
		contents: prompt,
	});
	const raw = apiResponse.text;
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
	// Remove stray quotes and misplaced newlines before commas to ensure valid JSON
	jsonStr = jsonStr.replace(/"\s*\n\s*"/g, '","');
	jsonStr = jsonStr.replace(/"\s*,/g, '",');

	try {
		const arr = JSON.parse(jsonStr) as Array<Omit<QuestionData, "type">>;
		const processedArr = arr.map((q) => {
			if (type === "cloze") {
				const clozeQuestion = q as ClozeQuestion;
				if (!clozeQuestion.blanks || !Array.isArray(clozeQuestion.blanks)) {
					clozeQuestion.blanks = [];
					console.warn(
						"[gemini.ts] generateBulkQuestions: 'blanks' field was missing or not an array in an item, defaulted to []. Problematic item:",
						JSON.stringify(q),
					);
				}
			}
			return q;
		});
		return processedArr.map((q) => ({ type, ...q }) as QuestionData);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`Failed to parse bulk response JSON: ${msg}`);
	}
}
