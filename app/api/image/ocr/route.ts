import { type NextRequest, NextResponse } from "next/server";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/image/ocr - Single image OCR
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   ├─ app/(protected)/decks/[deckId]/ocr/_components/ImageCardGenerator.tsx
 *
 * Dependencies (External files that this route uses):
 *   ├─ @/lib/supabase/server (createClient)
 *   └─ @/lib/llm/factory (createClientWithUserKey)
 *
 * Related Documentation:
 *   ├─ Batch API: app/api/batch/image/ocr/route.ts
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

interface OcrImageRequest {
	imageUrl: string;
}

interface OcrImageResponse {
	success: boolean;
	text?: string;
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
		const body = (await request.json()) as OcrImageRequest;
		const { imageUrl } = body;

		if (!imageUrl || typeof imageUrl !== "string") {
			return NextResponse.json(
				{ success: false, error: "imageUrl is required" },
				{ status: 400 },
			);
		}

		// 3. Process OCR
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

		// Fetch image file
		const res = await fetch(imageUrl);
		if (!res.ok) {
			return NextResponse.json(
				{
					success: false,
					error: `Failed to fetch image: ${res.status}`,
				},
				{ status: 400 },
			);
		}

		const arrayBuffer = await res.arrayBuffer();
		const blob = new Blob([arrayBuffer], {
			type: res.headers.get("content-type") ?? "image/png",
		});

		// Upload to Gemini Files API
		const uploadResult = await client.uploadFile?.(blob, {
			mimeType: blob.type,
		});

		if (!uploadResult) {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to upload image file",
				},
				{ status: 500 },
			);
		}

		// OCR
		const systemPrompt = "以下の画像からテキストを抽出してください。";

		const text = await client.generateWithFiles?.(systemPrompt, [
			{ uri: uploadResult.uri, mimeType: uploadResult.mimeType },
		]);

		if (!text) {
			return NextResponse.json(
				{
					success: false,
					error: "OCR failed: no response from LLM",
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			text: text.trim(),
		} satisfies OcrImageResponse);
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "OCR failed",
			} satisfies OcrImageResponse,
			{ status: 500 },
		);
	}
}
