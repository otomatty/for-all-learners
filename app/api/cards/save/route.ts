/**
 * Save Generated Cards API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ lib/hooks/cards/useSaveCards.ts (Phase 4.2)
 *
 * Dependencies (依存先):
 *   ├─ lib/utils/pdfUtils.ts (convertTextToTiptapJSON)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./route.spec.md (将来作成)
 *   └─ Tests: ./__tests__/route.test.ts (将来作成)
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { convertTextToTiptapJSON } from "@/lib/utils/pdfUtils";

interface CardToSavePayload {
	front_content: string;
	back_content: string;
}

interface SaveCardsRequest {
	cards: CardToSavePayload[];
	pageId: string;
	deckId: string;
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
		const body = (await request.json()) as SaveCardsRequest;

		if (!body.cards || !Array.isArray(body.cards)) {
			return NextResponse.json(
				{ error: "cardsは配列である必要があります" },
				{ status: 400 },
			);
		}

		if (body.cards.length === 0) {
			return NextResponse.json(
				{ error: "保存するカードがありません" },
				{ status: 400 },
			);
		}

		if (!body.pageId || typeof body.pageId !== "string") {
			return NextResponse.json({ error: "pageIdは必須です" }, { status: 400 });
		}

		if (!body.deckId || typeof body.deckId !== "string") {
			return NextResponse.json({ error: "deckIdは必須です" }, { status: 400 });
		}

		logger.info(
			{
				userId: user.id,
				cardCount: body.cards.length,
				pageId: body.pageId,
				deckId: body.deckId,
			},
			"Saving generated cards",
		);

		// カードをTiptap JSON形式に変換
		const cardsToSave = body.cards.map((rawCard) => ({
			deck_id: body.deckId,
			user_id: user.id,
			page_id: body.pageId,
			front_content: convertTextToTiptapJSON(rawCard.front_content),
			back_content: convertTextToTiptapJSON(rawCard.back_content),
		}));

		// カードを保存
		const { data: savedCards, error: saveError } = await supabase
			.from("cards")
			.insert(cardsToSave)
			.select();

		if (saveError) {
			logger.error(
				{ error: saveError, userId: user.id },
				"Failed to save cards",
			);
			return NextResponse.json(
				{
					error: saveError.message,
					savedCardsCount: 0,
				},
				{ status: 500 },
			);
		}

		logger.info(
			{
				userId: user.id,
				savedCardsCount: savedCards?.length || 0,
			},
			"Cards saved successfully",
		);

		return NextResponse.json({
			savedCardsCount: savedCards?.length || 0,
		});
	} catch (error: unknown) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to save cards",
		);

		return NextResponse.json(
			{ error: "カードの保存中にエラーが発生しました" },
			{ status: 500 },
		);
	}
}
