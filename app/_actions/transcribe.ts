"use server";

import { createClientWithUserKey } from "@/lib/llm/factory";

/**
 * Server action to transcribe an audio file at a public URL via Gemini API.
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
	if (!audioUrl) {
		throw new Error("No audio URL provided for transcription");
	}

	// Create dynamic LLM client
	const client = await createClientWithUserKey({ provider: "google" });

	// Fetch audio data from URL
	const res = await fetch(audioUrl);
	if (!res.ok) {
		throw new Error(`Failed to fetch audio for transcription: ${res.status}`);
	}
	const arrayBuffer = await res.arrayBuffer();
	const blob = new Blob([arrayBuffer], {
		type: res.headers.get("content-type") ?? "audio/wav",
	});

	// Upload file to Gemini
	if (!client.uploadFile || !client.generateWithFiles) {
		throw new Error("File upload is not supported by this provider");
	}

	const uploadResult = await client.uploadFile(blob, {
		mimeType: blob.type,
	});

	// Generate transcription using the uploaded file
	const transcript = await client.generateWithFiles(
		"この音声ファイルを文字起こししてください。",
		[{ uri: uploadResult.uri, mimeType: uploadResult.mimeType }],
	);

	return transcript;
}
