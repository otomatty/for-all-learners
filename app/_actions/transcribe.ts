"use server";

import { getGeminiClient } from "@/lib/gemini/client";
import { createPartFromUri, createUserContent } from "@google/genai";

// Define types for Gemini response to avoid using any
interface GeminiContentParts {
	parts: { text: string }[];
}

type GeminiCandidateContent = string | GeminiContentParts;

interface GenerateContentResponse {
	candidates?: { content: GeminiCandidateContent }[];
}

/**
 * Server action to transcribe an audio file at a public URL via Gemini API.
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
	if (!audioUrl) {
		throw new Error("No audio URL provided for transcription");
	}
	// Fetch audio data from Supabase URL and upload to Gemini Files API
	const res = await fetch(audioUrl);
	if (!res.ok) {
		throw new Error(`Failed to fetch audio for transcription: ${res.status}`);
	}
	const arrayBuffer = await res.arrayBuffer();
	// Convert ArrayBuffer to Blob to include size and mime type
	const blob = new Blob([arrayBuffer], {
		type: res.headers.get("content-type") ?? "audio/wav",
	});
	// Upload using global Blob; destructure to get mimeType as string
	const geminiClient = getGeminiClient();
	const { uri, mimeType } = await geminiClient.files.upload({
		file: blob,
		config: { mimeType: blob.type },
	});
	if (!uri) throw new Error("Upload failed: missing URI");
	const parts = [createPartFromUri(uri, mimeType ?? blob.type)];
	const contents = createUserContent(parts);

	// Call Gemini API for transcription
	const response = await geminiClient.models.generateContent({
		model: "gemini-2.5-flash",
		contents,
	});

	// Extract transcript from response candidates
	const { candidates } = response as unknown as GenerateContentResponse;
	const candidateContent = candidates?.[0]?.content;
	if (candidateContent == null) {
		throw new Error("Transcription failed: no content returned");
	}
	let transcript: string;
	if (typeof candidateContent === "string") {
		transcript = candidateContent;
	} else if (
		typeof candidateContent === "object" &&
		Array.isArray((candidateContent as { parts: { text: string }[] }).parts)
	) {
		transcript = (candidateContent as { parts: { text: string }[] }).parts
			.map((p: { text: string }) => p.text)
			.join("");
	} else {
		transcript = String(candidateContent);
	}
	return transcript;
}
