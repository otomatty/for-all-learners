/**
 * Generate Cards API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ lib/hooks/ai/useGenerateCards.ts (Phase 4.2)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/generateCards.ts (移行元)
 *   ├─ lib/llm/factory.ts (createClientWithUserKey)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./route.spec.md (将来作成)
 *   └─ Tests: ./__tests__/route.test.ts (将来作成)
 */

import { type NextRequest, NextResponse } from "next/server";
import { generateCardsFromTranscript } from "@/app/_actions/generateCards";
import type { LLMProvider } from "@/lib/llm/client";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
	getProviderValidationErrorMessage,
	isValidProvider,
} from "@/lib/validators/ai";

interface GenerateCardsRequest {
	transcript: string;
	sourceAudioUrl: string;
	provider?: LLMProvider;
	model?: string;
}

export async function POST(request: NextRequest) {
	try {
		// 認証チェック
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
		}

		// リクエストボディの取得とバリデーション
		const body = (await request.json()) as GenerateCardsRequest;

		if (typeof body.transcript !== "string") {
			return NextResponse.json(
				{ error: "transcriptは必須です" },
				{ status: 400 },
			);
		}

		if (!body.transcript || body.transcript.trim() === "") {
			return NextResponse.json(
				{ error: "transcriptが空です" },
				{ status: 400 },
			);
		}

		if (!body.sourceAudioUrl || typeof body.sourceAudioUrl !== "string") {
			return NextResponse.json(
				{ error: "sourceAudioUrlは必須です" },
				{ status: 400 },
			);
		}

		// providerのバリデーション
		if (body.provider && !isValidProvider(body.provider)) {
			return NextResponse.json(
				{
					error: getProviderValidationErrorMessage(),
				},
				{ status: 400 },
			);
		}

		logger.info(
			{
				userId: user.id,
				provider: body.provider || "google",
				model: body.model,
				transcriptLength: body.transcript.length,
			},
			"Starting card generation from transcript",
		);

		// カード生成
		const cards = await generateCardsFromTranscript(
			body.transcript,
			body.sourceAudioUrl,
			{
				provider: body.provider,
				model: body.model,
			},
		);

		logger.info(
			{ userId: user.id, cardCount: cards.length },
			"Card generation completed",
		);

		return NextResponse.json({ cards });
	} catch (error: unknown) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to generate cards",
		);

		if (error instanceof Error) {
			// APIキー未設定エラーの場合
			if (error.message.includes("API key")) {
				return NextResponse.json(
					{
						error:
							"APIキーが設定されていません。設定画面でAPIキーを設定してください。",
					},
					{ status: 400 },
				);
			}

			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(
			{ error: "カード生成中にエラーが発生しました" },
			{ status: 500 },
		);
	}
}
