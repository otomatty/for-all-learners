/**
 * PDF Job Management API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that use this route):
 *   └─ hooks/batch/usePdfJobManager.ts (作成予定)
 *
 * Dependencies (External files that this route imports):
 *   ├─ app/_actions/pdfJobManager.ts (createPdfProcessingJob, cancelPdfJob, retryPdfJob)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts (logger)
 *
 * Related Documentation:
 *   ├─ Spec: ./route.spec.md (作成予定)
 *   ├─ Tests: ./__tests__/route.test.ts (作成予定)
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 *
 * Note: revalidatePath() is not available in API Routes.
 * Cache invalidation should be handled on the client side using TanStack Query.
 */

import {
	cancelPdfJob,
	createPdfProcessingJob,
	retryPdfJob,
	type CreatePdfJobParams,
} from "@/app/_actions/pdfJobManager";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Base64文字列をFileオブジェクトに変換
 */
function base64ToFile(
	base64: string,
	fileName: string,
	mimeType: string,
): File {
	try {
		const byteCharacters = atob(base64);
		const byteNumbers = new Array(byteCharacters.length);
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i);
		}
		const byteArray = new Uint8Array(byteNumbers);
		const blob = new Blob([byteArray], { type: mimeType });
		return new File([blob], fileName, { type: mimeType });
	} catch (error) {
		throw new Error(
			`Failed to decode base64: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
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
		const body = await request.json();

		// Route to appropriate handler based on action
		if (body.action === "create") {
			// Validation
			if (!body.deckId || !body.pdfFile || !body.processingOptions) {
				return NextResponse.json(
					{ error: "deckId, pdfFile, and processingOptions are required" },
					{ status: 400 },
				);
			}

			// Convert Base64 string to File
			const pdfFile = base64ToFile(
				body.pdfFile.base64,
				body.pdfFile.name,
				body.pdfFile.type || "application/pdf",
			);

			const params: CreatePdfJobParams = {
				deckId: body.deckId,
				pdfFile,
				processingOptions: body.processingOptions,
			};

			const result = await createPdfProcessingJob(params);

			logger.info(
				{
					userId: user.id,
					deckId: body.deckId,
					jobId: result.jobId,
					success: result.success,
				},
				"PDF processing job created",
			);

			return NextResponse.json(result);
		}

		if (body.action === "cancel") {
			// Validation
			if (!body.jobId) {
				return NextResponse.json(
					{ error: "jobId is required" },
					{ status: 400 },
				);
			}

			const result = await cancelPdfJob(body.jobId);

			logger.info(
				{
					userId: user.id,
					jobId: body.jobId,
					success: result.success,
				},
				"PDF processing job cancelled",
			);

			return NextResponse.json(result);
		}

		if (body.action === "retry") {
			// Validation
			if (!body.jobId) {
				return NextResponse.json(
					{ error: "jobId is required" },
					{ status: 400 },
				);
			}

			const result = await retryPdfJob(body.jobId);

			logger.info(
				{
					userId: user.id,
					jobId: body.jobId,
					success: result.success,
				},
				"PDF processing job retried",
			);

			return NextResponse.json(result);
		}

		return NextResponse.json(
			{ error: "Invalid action. Must be one of: create, cancel, retry" },
			{ status: 400 },
		);
	} catch (error) {
		logger.error({ error }, "PDF job management failed");

		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
