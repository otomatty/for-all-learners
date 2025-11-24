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

import type { JSONContent } from "@tiptap/core";
import { type NextRequest, NextResponse } from "next/server";
import { extractTextFromTiptap } from "@/components/pages/extract-text-from-tiptap";
import type { LLMProvider } from "@/lib/llm/client";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { buildPrompt } from "@/lib/llm/prompt-builder";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { convertTextToTiptapJSON } from "@/lib/utils/pdfUtils";
import {
	getProviderValidationErrorMessage,
	isValidProvider,
} from "@/lib/validators/ai";
import type { Json } from "@/types/database.types";

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
			return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
		}

		// リクエストボディの取得とバリデーション
		const body = (await request.json()) as GenerateCardsFromPageRequest;

		if (!body.pageId || typeof body.pageId !== "string") {
			return NextResponse.json({ error: "pageIdは必須です" }, { status: 400 });
		}

		if (!body.deckId || typeof body.deckId !== "string") {
			return NextResponse.json({ error: "deckIdは必須です" }, { status: 400 });
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

		const provider = (body.provider || "google") as LLMProvider;

		logger.info(
			{
				userId: user.id,
				pageId: body.pageId,
				deckId: body.deckId,
				provider,
				model: body.model,
				saveToDatabase: body.saveToDatabase ?? false,
			},
			"Starting card generation from page",
		);

		// Tiptap JSONからテキストを抽出
		if (!body.pageContentTiptap) {
			return NextResponse.json(
				{
					error: "ページに抽出可能なテキストコンテンツがありません。",
					cards: [],
				},
				{ status: 400 },
			);
		}

		const pageText = extractTextFromTiptap(
			body.pageContentTiptap as JSONContent,
			10000, // 最大長を大きく設定
		);

		if (!pageText || pageText.trim() === "") {
			return NextResponse.json(
				{
					error: "ページに抽出可能なテキストコンテンツがありません。",
					cards: [],
				},
				{ status: 400 },
			);
		}

		try {
			// LLMクライアントを作成
			const client = await createClientWithUserKey({
				provider,
				model: body.model,
			});

			// プロンプトを構築
			const systemPrompt = `以下のページコンテンツから、学習用のフラッシュカードを生成してください。

出力形式（JSON配列）:
[
  {
    "front_content": "問題文",
    "back_content": "回答"
  }
]

要件:
- 重要な概念やキーワードを問題として抽出
- 回答は簡潔で明確に
- 最低3つ以上のカードを生成
- JSON配列のみを返す（マークダウンのコードフェンスは不要）`;

			const prompt = buildPrompt([systemPrompt, pageText]);

			// LLM APIを呼び出し
			const response = await client.generate(prompt);

			if (!response || response.trim() === "") {
				return NextResponse.json(
					{
						error: "AIによるカード生成に失敗しました: AIからの応答が空です。",
						cards: [],
					},
					{ status: 400 },
				);
			}

			// JSONを抽出（コードフェンスから、またはフォールバック）
			let jsonStr: string;
			const fenceMatch =
				response.match(/```json\s*([\s\S]*?)```/i) ||
				response.match(/```\s*([\s\S]*?)```/);
			if (fenceMatch?.[1]) {
				jsonStr = fenceMatch[1].trim();
			} else {
				// フォールバック: 最初の [ から最後の ] までを抽出
				const match = response.match(/\[[\s\S]*\]/);
				if (!match) {
					return NextResponse.json(
						{
							error:
								"AIによるカード生成に失敗しました: JSONの解析に失敗しました。",
							cards: [],
						},
						{ status: 400 },
					);
				}
				jsonStr = match[0].trim();
			}

			// JSONをパース
			let generatedRawCards: Array<{
				front_content: string;
				back_content: string;
			}>;
			try {
				generatedRawCards = JSON.parse(jsonStr);
			} catch (error) {
				logger.error(
					{
						error: error instanceof Error ? error.message : String(error),
						jsonStr: jsonStr.substring(0, 200),
					},
					"Failed to parse cards JSON",
				);
				return NextResponse.json(
					{
						error:
							"AIによるカード生成に失敗しました: JSONの解析に失敗しました。",
						cards: [],
					},
					{ status: 400 },
				);
			}

			if (!Array.isArray(generatedRawCards) || generatedRawCards.length === 0) {
				return NextResponse.json(
					{
						error: "AIによってカードが生成されませんでした。",
						cards: [],
					},
					{ status: 400 },
				);
			}

			// データベースに保存する場合
			if (body.saveToDatabase) {
				const cardsToSave = generatedRawCards.map((card) => ({
					deck_id: body.deckId,
					user_id: user.id,
					page_id: body.pageId,
					front_content: convertTextToTiptapJSON(card.front_content),
					back_content: convertTextToTiptapJSON(card.back_content),
				}));

				// カードを保存
				const { data: savedCards, error: saveError } = await supabase
					.from("cards")
					.insert(cardsToSave)
					.select();

				if (saveError) {
					logger.error(
						{ error: saveError },
						"Failed to save cards to database",
					);
					return NextResponse.json(
						{
							cards: generatedRawCards,
							savedCardsCount: 0,
							error: saveError.message,
						},
						{ status: 500 },
					);
				}

				logger.info(
					{
						userId: user.id,
						savedCardsCount: savedCards?.length || 0,
					},
					"Cards saved to database",
				);

				return NextResponse.json({
					cards: generatedRawCards,
					savedCardsCount: savedCards?.length || 0,
				});
			}

			logger.info(
				{ userId: user.id, cardCount: generatedRawCards.length },
				"Card generation completed",
			);

			return NextResponse.json({
				cards: generatedRawCards,
			});
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logger.error(
				{ error: errorMessage },
				"Failed to generate cards from page",
			);

			// APIキー未設定エラーの場合
			if (errorMessage.includes("API key")) {
				return NextResponse.json(
					{
						error:
							"AIによるカード生成に失敗しました: APIキーが設定されていません。設定画面でAPIキーを設定してください。",
						cards: [],
					},
					{ status: 400 },
				);
			}

			return NextResponse.json(
				{
					error: `AIによるカード生成に失敗しました: ${errorMessage}`,
					cards: [],
				},
				{ status: 500 },
			);
		}
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
