import { GoogleGenAI } from "@google/genai";

// Validate that the API key is set
if (!process.env.GEMINI_API_KEY) {
	throw new Error("Missing GEMINI_API_KEY environment variable");
}

// Export a singleton Gemini client
export const geminiClient = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
});
