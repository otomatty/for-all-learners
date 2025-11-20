/**
 * Unified Batch Processing API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that use this route):
 *   └─ hooks/batch/useUnifiedBatchProcessing.ts (作成予定)
 *
 * Dependencies (External files that this route imports):
 *   ├─ app/_actions/unifiedBatchProcessor.ts (processUnifiedBatch)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Documentation:
 *   ├─ Spec: ./route.spec.md (作成予定)
 *   ├─ Tests: ./__tests__/route.test.ts (作成予定)
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { processUnifiedBatch } from "@/app/_actions/unifiedBatchProcessor";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
		const body = await request.json();

		// Validation
		if (!body.batchInput) {
			return NextResponse.json(
				{ error: "batchInput is required" },
				{ status: 400 },
			);
		}

		// Call existing Server Action
		const result = await processUnifiedBatch(user.id, body.batchInput);

		logger.info(
			{
				userId: user.id,
				batchType: result.batchType,
				success: result.success,
			},
			"Unified batch processing completed",
		);

		return NextResponse.json(result);
	} catch (error) {
		logger.error({ error }, "Unified batch processing failed");

		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
