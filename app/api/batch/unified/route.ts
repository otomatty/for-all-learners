/**
 * Unified Batch Processing API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ hooks/batch/useUnifiedBatchProcessing.ts (クライアント側フック)
 *   └─ components/batch/UnifiedBatchProcessor.tsx (UIコンポーネント)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/unifiedBatchProcessor.ts (processUnifiedBatch)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	processUnifiedBatch,
	type UnifiedBatchInput,
} from "@/app/_actions/unifiedBatchProcessor";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
	try {
		const batchInput = (await request.json()) as UnifiedBatchInput;

		// Validation
		if (!batchInput.type || !["multi-file", "audio-batch", "image-batch"].includes(batchInput.type)) {
			return NextResponse.json(
				{ error: "Invalid batch type. Must be 'multi-file', 'audio-batch', or 'image-batch'" },
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
				batchType: batchInput.type,
			},
			"Starting unified batch processing",
		);

		// バッチ処理実行
		const result = await processUnifiedBatch(user.id, batchInput);

		logger.info(
			{
				userId: user.id,
				batchType: batchInput.type,
				success: result.success,
				apiRequestsUsed: result.apiRequestsUsed,
			},
			"Unified batch processing completed",
		);

		return NextResponse.json(result);
	} catch (err: unknown) {
		logger.error(
			{
				error: err instanceof Error ? err.message : String(err),
			},
			"Failed to process unified batch",
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
