/**
 * Image Batch OCR API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that use this route):
 *   └─ hooks/batch/useImageBatchOcr.ts (作成予定)
 *
 * Dependencies (External files that this route imports):
 *   ├─ app/_actions/transcribeImageBatch.ts (transcribeImagesBatch)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Documentation:
 *   ├─ Spec: ./route.spec.md
 *   ├─ Tests: ./__tests__/route.test.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { transcribeImagesBatch } from "@/app/_actions/transcribeImageBatch";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface ImageBatchOcrRequest {
	pages: Array<{
		pageNumber: number;
		imageUrl: string;
	}>;
	batchSize?: number;
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
		const body: ImageBatchOcrRequest = await request.json();

		// Validation
		if (!body.pages || !Array.isArray(body.pages)) {
			return NextResponse.json(
				{ error: "pages are required" },
				{ status: 400 },
			);
		}

		if (body.pages.length === 0) {
			return NextResponse.json(
				{ error: "pages must not be empty" },
				{ status: 400 },
			);
		}

		// Call existing Server Action
		const result = await transcribeImagesBatch(
			body.pages,
			body.batchSize || 4,
		);

		logger.info(
			{
				userId: user.id,
				pageCount: body.pages.length,
				batchSize: body.batchSize || 4,
				success: result.success,
			},
			"Image batch OCR completed",
		);

		return NextResponse.json(result);
	} catch (error) {
		logger.error({ error }, "Image batch OCR failed");

		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
