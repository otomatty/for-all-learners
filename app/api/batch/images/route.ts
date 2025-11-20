/**
 * Image Batch OCR Processing API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ hooks/batch/useImageBatchProcessing.ts (クライアント側フック)
 *   └─ components/batch/ImageBatchProcessor.tsx (UIコンポーネント)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/transcribeImageBatch.ts (transcribeImagesBatch)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	transcribeImagesBatch,
	type BatchOcrPage,
} from "@/app/_actions/transcribeImageBatch";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
	try {
		const { pages, batchSize } = (await request.json()) as {
			pages: Array<{
				pageNumber: number;
				imageUrl: string;
			}>;
			batchSize?: number;
		};

		// Validation
		if (!pages || !Array.isArray(pages) || pages.length === 0) {
			return NextResponse.json(
				{ error: "pages array is required and must not be empty" },
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
				pageCount: pages.length,
				batchSize: batchSize || 4,
			},
			"Starting image batch OCR processing",
		);

		// バッチ処理実行
		const batchOcrPages: BatchOcrPage[] = pages.map((page) => ({
			pageNumber: page.pageNumber,
			imageUrl: page.imageUrl,
		}));

		const result = await transcribeImagesBatch(batchOcrPages, batchSize || 4);

		logger.info(
			{
				userId: user.id,
				success: result.success,
				processedCount: result.processedCount,
				skippedCount: result.skippedCount,
			},
			"Image batch OCR processing completed",
		);

		return NextResponse.json(result);
	} catch (err: unknown) {
		logger.error(
			{
				error: err instanceof Error ? err.message : String(err),
			},
			"Failed to process image batch OCR",
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
