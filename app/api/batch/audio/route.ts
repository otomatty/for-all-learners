/**
 * Audio Batch Processing API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that use this route):
 *   └─ hooks/batch/useAudioBatchProcessing.ts (作成予定)
 *
 * Dependencies (External files that this route imports):
 *   ├─ app/_actions/audioBatchProcessing.ts (processAudioFilesBatch)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Documentation:
 *   ├─ Spec: ./route.spec.md
 *   ├─ Tests: ./__tests__/route.test.ts (作成予定)
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { processAudioFilesBatch } from "@/app/_actions/audioBatchProcessing";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface AudioBatchRequest {
	audioFiles: Array<{
		audioId: string;
		audioName: string;
		audioBlob: string; // Base64エンコードされた文字列
		metadata?: {
			duration?: number;
			language?: string;
			priority?: number;
		};
	}>;
}

/**
 * Base64文字列をBlobに変換
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
	try {
		const byteCharacters = atob(base64);
		const byteNumbers = new Array(byteCharacters.length);
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i);
		}
		const byteArray = new Uint8Array(byteNumbers);
		return new Blob([byteArray], { type: mimeType });
	} catch (error) {
		throw new Error(`Failed to decode base64: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

export async function POST(request: Request) {
	try {
		// Authentication check
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Parse request body
		const body: AudioBatchRequest = await request.json();

		// Validation
		if (!body.audioFiles || !Array.isArray(body.audioFiles)) {
			return NextResponse.json(
				{ error: "audioFiles are required" },
				{ status: 400 },
			);
		}

		if (body.audioFiles.length === 0) {
			return NextResponse.json(
				{ error: "audioFiles must not be empty" },
				{ status: 400 },
			);
		}

		// Convert Base64 strings to Blobs
		const audioFilesWithBlobs = body.audioFiles.map((file) => {
			const mimeType = file.audioName.endsWith(".mp3")
				? "audio/mpeg"
				: "audio/wav";
			return {
				audioId: file.audioId,
				audioName: file.audioName,
				audioBlob: base64ToBlob(file.audioBlob, mimeType),
				metadata: file.metadata,
			};
		});

		// Call existing Server Action
		const result = await processAudioFilesBatch(user.id, audioFilesWithBlobs);

		logger.info(
			{
				userId: user.id,
				audioFileCount: body.audioFiles.length,
				success: result.success,
				totalCards: result.totalCards,
			},
			"Audio batch processing completed",
		);

		return NextResponse.json(result);
	} catch (error) {
		logger.error({ error }, "Audio batch processing failed");

		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
