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
import { createClientWithUserKey } from "@/lib/llm/factory";
import { buildPrompt } from "@/lib/llm/prompt-builder";
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

		const provider = (body.provider || "google") as LLMProvider;

		logger.info(
			{
				userId: user.id,
				provider,
				model: body.model,
				transcriptLength: body.transcript.length,
			},
			"Starting card generation from transcript",
		);

		// LLMクライアントを作成
		const client = await createClientWithUserKey({
			provider,
			model: body.model,
		});

		// プロンプトを構築
		const systemPrompt = `以下のトランスクリプトから、学習用のフラッシュカードを生成してください。

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

		const prompt = buildPrompt([systemPrompt, body.transcript]);

		// LLM APIを呼び出し
		const response = await client.generate(prompt);

		if (!response || response.trim() === "") {
			throw new Error("カード生成に失敗しました: 内容が空です");
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
				throw new Error("カード生成結果の解析に失敗しました");
			}
			jsonStr = match[0].trim();
		}

		// JSONをパース
		let cards: Array<{ front_content: string; back_content: string }>;
		try {
			cards = JSON.parse(jsonStr);
		} catch (error) {
			logger.error(
				{
					error: error instanceof Error ? error.message : String(error),
					jsonStr: jsonStr.substring(0, 200),
				},
				"Failed to parse cards JSON",
			);
			throw new Error("カード生成結果の解析に失敗しました");
		}

		if (!Array.isArray(cards) || cards.length === 0) {
			throw new Error("カード生成に失敗しました: 内容が空です");
		}

		// source_audio_urlを追加
		const cardsWithAudioUrl = cards.map((card) => ({
			...card,
			source_audio_url: body.sourceAudioUrl,
		}));

		logger.info(
			{ userId: user.id, cardCount: cardsWithAudioUrl.length },
			"Card generation completed",
		);

		return NextResponse.json({ cards: cardsWithAudioUrl });
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
