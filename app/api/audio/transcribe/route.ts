import { type NextRequest, NextResponse } from "next/server";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/audio/transcribe - Single audio transcription
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   ├─ app/(protected)/decks/[deckId]/audio/_components/AudioCardGenerator.tsx
 *
 * Dependencies (External files that this route uses):
 *   ├─ @/lib/supabase/server (createClient)
 *   └─ @/lib/llm/factory (createClientWithUserKey)
 *
 * Related Documentation:
 *   ├─ Batch API: app/api/batch/audio/transcribe/route.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

interface TranscribeAudioRequest {
	audioUrl: string;
}

interface TranscribeAudioResponse {
	success: boolean;
	transcript?: string;
	error?: string;
}

export async function POST(request: NextRequest) {
	try {
		// 1. Authentication check
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		// 2. Parse request body
		const body = (await request.json()) as TranscribeAudioRequest;
		const { audioUrl } = body;

		if (!audioUrl || typeof audioUrl !== "string") {
			return NextResponse.json(
				{ success: false, error: "audioUrl is required" },
				{ status: 400 },
			);
		}

		// 3. Transcribe audio
		const client = await createClientWithUserKey({ provider: "google" });

		if (!client.uploadFile || !client.generateWithFiles) {
			return NextResponse.json(
				{
					success: false,
					error: "File upload is not supported by this provider",
				},
				{ status: 503 },
			);
		}

		// Fetch audio file
		const response = await fetch(audioUrl);
		if (!response.ok) {
			return NextResponse.json(
				{
					success: false,
					error: `Failed to fetch audio: ${response.status}`,
				},
				{ status: 400 },
			);
		}

		const audioBlob = await response.blob();

		// Upload to Gemini Files API
		const uploadResult = await client.uploadFile?.(audioBlob, {
			mimeType: audioBlob.type,
		});

		if (!uploadResult) {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to upload audio file",
				},
				{ status: 500 },
			);
		}

		// Transcribe
		const systemPrompt = "以下の音声ファイルを文字起こししてください。";

		const transcript = await client.generateWithFiles?.(systemPrompt, [
			{ uri: uploadResult.uri, mimeType: uploadResult.mimeType },
		]);

		if (!transcript) {
			return NextResponse.json(
				{
					success: false,
					error: "Transcription failed: no response from LLM",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			transcript: transcript.trim(),
		} satisfies TranscribeAudioResponse);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Transcription failed",
			} satisfies TranscribeAudioResponse,
			{ status: 500 },
		);
	}
}
