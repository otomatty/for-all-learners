/**
 * PDF Batch OCR Processing API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ hooks/batch/usePdfBatchProcessing.ts (クライアント側フック)
 *   └─ components/batch/PdfBatchProcessor.tsx (UIコンポーネント)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/pdfBatchOcr.ts (processPdfBatchOcr, processDualPdfBatchOcr)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Documentation:
 *   ├─ Issue: docs/01_issues/open/2025_11/20251117_01_phase3-storage-remaining-tasks.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.1)
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	processPdfBatchOcr,
	processDualPdfBatchOcr,
	type BatchOcrResult,
	type DualPdfOcrResult,
} from "@/app/_actions/pdfBatchOcr";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as
			| {
					mode: "single";
					imagePages: Array<{
						pageNumber: number;
						imageBlob: string; // Base64 encoded
					}>;
			  }
			| {
					mode: "dual";
					questionPages: Array<{
						pageNumber: number;
						imageBlob: string; // Base64 encoded
					}>;
					answerPages: Array<{
						pageNumber: number;
						imageBlob: string; // Base64 encoded
					}>;
			  };

		// Validation
		if (!body.mode || !["single", "dual"].includes(body.mode)) {
			return NextResponse.json(
				{ error: "mode must be 'single' or 'dual'" },
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
				mode: body.mode,
			},
			"Starting PDF batch OCR processing",
		);

		// Base64をBlobに変換するヘルパー関数
		const base64ToBlob = (base64: string, mimeType = "image/png"): Blob => {
			const base64Data = base64.split(",")[1] || base64;
			const binaryString = atob(base64Data);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			return new Blob([bytes], { type: mimeType });
		};

		let result: BatchOcrResult | DualPdfOcrResult;

		if (body.mode === "single") {
			// 単一PDFモード
			if (!body.imagePages || !Array.isArray(body.imagePages)) {
				return NextResponse.json(
					{ error: "imagePages array is required for single mode" },
					{ status: 400 },
				);
			}

			const imagePages = body.imagePages.map((page) => ({
				pageNumber: page.pageNumber,
				imageBlob: base64ToBlob(page.imageBlob),
			}));

			result = await processPdfBatchOcr(imagePages);
		} else {
			// デュアルPDFモード
			if (
				!body.questionPages ||
				!Array.isArray(body.questionPages) ||
				!body.answerPages ||
				!Array.isArray(body.answerPages)
			) {
				return NextResponse.json(
					{
						error:
							"questionPages and answerPages arrays are required for dual mode",
					},
					{ status: 400 },
				);
			}

			const questionPages = body.questionPages.map((page) => ({
				pageNumber: page.pageNumber,
				imageBlob: base64ToBlob(page.imageBlob),
			}));

			const answerPages = body.answerPages.map((page) => ({
				pageNumber: page.pageNumber,
				imageBlob: base64ToBlob(page.imageBlob),
			}));

			result = await processDualPdfBatchOcr(questionPages, answerPages);
		}

		logger.info(
			{
				userId: user.id,
				mode: body.mode,
				success: result.success,
			},
			"PDF batch OCR processing completed",
		);

		return NextResponse.json(result);
	} catch (err: unknown) {
		logger.error(
			{
				error: err instanceof Error ? err.message : String(err),
			},
			"Failed to process PDF batch OCR",
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
