import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
	if (geminiClient) {
		return geminiClient;
	}

	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("Missing GEMINI_API_KEY environment variable");
	}

	geminiClient = new GoogleGenAI({ apiKey });
	return geminiClient;
}
