/**
 * Audio Batch Processing API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ hooks/batch/useAudioBatchProcessing.ts (クライアント側フック)
 *   └─ components/batch/AudioBatchProcessor.tsx (UIコンポーネント)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/audioBatchProcessing.ts (processAudioFilesBatch)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

import { type NextRequest, NextResponse } from "next/server";
import { processAudioFilesBatch, type AudioBatchInput } from "@/app/_actions/audioBatchProcessing";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
	try {
		const { audioFiles } = (await request.json()) as {
			audioFiles: Array<{
				audioId: string;
				audioName: string;
				audioBlob: string; // Base64 encoded
				metadata?: {
					duration?: number;
					language?: string;
					priority?: number;
				};
			}>;
		};

		// Validation
		if (!audioFiles || !Array.isArray(audioFiles) || audioFiles.length === 0) {
			return NextResponse.json(
				{ error: "audioFiles array is required and must not be empty" },
				{ status: 400 },
			);
		}

		// 認証チェック
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

		logger.info(
			{
				userId: user.id,
				audioFileCount: audioFiles.length,
			},
			"Starting audio batch processing",
		);

		// Base64をBlobに変換
		const audioBatchInput: AudioBatchInput[] = await Promise.all(
			audioFiles.map(async (audio) => {
				// Base64デコード
				const base64Data = audio.audioBlob.split(",")[1] || audio.audioBlob;
				const binaryString = atob(base64Data);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}
				const audioBlob = new Blob([bytes], {
					type: audio.audioName.endsWith(".mp3") ? "audio/mpeg" : "audio/wav",
				});

				return {
					audioId: audio.audioId,
					audioName: audio.audioName,
					audioBlob,
					metadata: audio.metadata,
				};
			}),
		);

		// バッチ処理実行
		const result = await processAudioFilesBatch(user.id, audioBatchInput);

		logger.info(
			{
				userId: user.id,
				success: result.success,
				totalCards: result.totalCards,
				apiRequestsUsed: result.apiRequestsUsed,
			},
			"Audio batch processing completed",
		);

		return NextResponse.json(result);
	} catch (err: unknown) {
		logger.error(
			{
				error: err instanceof Error ? err.message : String(err),
			},
			"Failed to process audio batch",
		);

		if (err instanceof Error) {
			return NextResponse.json({ error: err.message }, { status: 500 });
		}
		return NextResponse.json(
			{ error: "An unknown error occurred" },
			{ status: 500 },
		);
	}
}
