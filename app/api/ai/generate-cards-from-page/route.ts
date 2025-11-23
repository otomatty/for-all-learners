/**
 * Generate Cards From Page API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ lib/hooks/ai/useGenerateCardsFromPage.ts (Phase 4.2)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/generateCardsFromPage.ts (移行元)
 *   ├─ lib/llm/factory.ts (createClientWithUserKey)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./route.spec.md (将来作成)
 *   └─ Tests: ./__tests__/route.test.ts (将来作成)
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	generateRawCardsFromPageContent,
	saveGeneratedCards,
	wrapTextInTiptapJson,
} from "@/app/_actions/generateCardsFromPage";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { LLMProvider } from "@/lib/llm/client";
import type { Json } from "@/types/database.types";
import {
	getProviderValidationErrorMessage,
	isValidProvider,
} from "@/lib/validators/ai";

interface GenerateCardsFromPageRequest {
	pageContentTiptap: Json | null;
	pageId: string;
	deckId: string;
	saveToDatabase?: boolean;
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
			return NextResponse.json(
				{ error: "認証が必要です" },
				{ status: 401 },
			);
		}

		// リクエストボディの取得とバリデーション
		const body = (await request.json()) as GenerateCardsFromPageRequest;

		if (!body.pageId || typeof body.pageId !== "string") {
			return NextResponse.json(
				{ error: "pageIdは必須です" },
				{ status: 400 },
			);
		}

		if (!body.deckId || typeof body.deckId !== "string") {
			return NextResponse.json(
				{ error: "deckIdは必須です" },
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
				pageId: body.pageId,
				deckId: body.deckId,
				provider: body.provider || "google",
				model: body.model,
				saveToDatabase: body.saveToDatabase ?? false,
			},
			"Starting card generation from page",
		);

		// カード生成
		const result = await generateRawCardsFromPageContent(
			body.pageContentTiptap,
			{
				provider: body.provider,
				model: body.model,
			},
		);

		if (result.error) {
			return NextResponse.json(
				{ error: result.error, cards: result.generatedRawCards },
				{ status: 400 },
			);
		}

		// データベースに保存する場合
		if (body.saveToDatabase) {
			const cardsToSave = await Promise.all(
				result.generatedRawCards.map(async (card) => {
					const frontContent = await wrapTextInTiptapJson(
						card.front_content,
					);
					const backContent = await wrapTextInTiptapJson(
						card.back_content,
					);

					return {
						deck_id: body.deckId,
						user_id: user.id,
						front_content: frontContent,
						back_content: backContent,
						page_id: body.pageId,
					};
				}),
			);

			const saveResult = await saveGeneratedCards(cardsToSave, user.id);

			if (saveResult.error) {
				logger.error(
					{ error: saveResult.error },
					"Failed to save cards to database",
				);
				return NextResponse.json(
					{
						cards: result.generatedRawCards,
						savedCardsCount: saveResult.savedCardsCount,
						error: saveResult.error,
					},
					{ status: 500 },
				);
			}

			logger.info(
				{
					userId: user.id,
					savedCardsCount: saveResult.savedCardsCount,
				},
				"Cards saved to database",
			);

			return NextResponse.json({
				cards: result.generatedRawCards,
				savedCardsCount: saveResult.savedCardsCount,
			});
		}

		logger.info(
			{ userId: user.id, cardCount: result.generatedRawCards.length },
			"Card generation completed",
		);

		return NextResponse.json({
			cards: result.generatedRawCards,
		});
	} catch (error: unknown) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to generate cards from page",
		);

		if (error instanceof Error) {
			// APIキー未設定エラーの場合
			if (error.message.includes("API key")) {
				return NextResponse.json(
					{ error: "APIキーが設定されていません。設定画面でAPIキーを設定してください。" },
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

