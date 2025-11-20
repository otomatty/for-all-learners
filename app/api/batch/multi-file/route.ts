/**
 * Multi-File Batch Processing API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ hooks/batch/useMultiFileBatchProcessing.ts (クライアント側フック)
 *   └─ components/batch/MultiFileBatchProcessor.tsx (UIコンポーネント)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/multiFileBatchProcessing.ts (processMultiFilesBatch)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	processMultiFilesBatch,
	type MultiFileInput,
} from "@/app/_actions/multiFileBatchProcessing";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
	try {
		const { files } = (await request.json()) as {
			files: Array<{
				fileId: string;
				fileName: string;
				fileType: "pdf" | "image" | "audio";
				fileBlob: string; // Base64 encoded
				metadata?: {
					isQuestion?: boolean;
					isAnswer?: boolean;
					priority?: number;
				};
			}>;
		};

		// Validation
		if (!files || !Array.isArray(files) || files.length === 0) {
			return NextResponse.json(
				{ error: "files array is required and must not be empty" },
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
				fileCount: files.length,
			},
			"Starting multi-file batch processing",
		);

		// Base64をBlobに変換
		const multiFileInput: MultiFileInput[] = await Promise.all(
			files.map(async (file) => {
				// Base64デコード
				const base64Data = file.fileBlob.split(",")[1] || file.fileBlob;
				const binaryString = atob(base64Data);
				const bytes = new Uint8Array(binaryString.length);
				for (let i = 0; i < binaryString.length; i++) {
					bytes[i] = binaryString.charCodeAt(i);
				}

				// ファイルタイプに応じたMIMEタイプを決定
				let mimeType = "application/octet-stream";
				if (file.fileType === "pdf") {
					mimeType = "application/pdf";
				} else if (file.fileType === "image") {
					mimeType = file.fileName.endsWith(".png")
						? "image/png"
						: file.fileName.endsWith(".jpg") || file.fileName.endsWith(".jpeg")
							? "image/jpeg"
							: "image/png";
				} else if (file.fileType === "audio") {
					mimeType = file.fileName.endsWith(".mp3")
						? "audio/mpeg"
						: "audio/wav";
				}

				const fileBlob = new Blob([bytes], { type: mimeType });

				return {
					fileId: file.fileId,
					fileName: file.fileName,
					fileType: file.fileType,
					fileBlob,
					metadata: file.metadata,
				};
			}),
		);

		// バッチ処理実行
		const result = await processMultiFilesBatch(user.id, multiFileInput);

		logger.info(
			{
				userId: user.id,
				success: result.success,
				totalCards: result.totalCards,
				apiRequestsUsed: result.apiRequestsUsed,
			},
			"Multi-file batch processing completed",
		);

		return NextResponse.json(result);
	} catch (err: unknown) {
		logger.error(
			{
				error: err instanceof Error ? err.message : String(err),
			},
			"Failed to process multi-file batch",
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
