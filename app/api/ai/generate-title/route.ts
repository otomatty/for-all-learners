/**
 * Generate Title API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ lib/hooks/ai/useGenerateTitle.ts (Phase 4.2)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/generateTitle.ts (移行元)
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
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

interface GenerateTitleRequest {
	transcript: string;
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
		const body = (await request.json()) as GenerateTitleRequest;

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

		logger.info(
			{
				userId: user.id,
				transcriptLength: body.transcript.length,
			},
			"Starting title generation",
		);

		// LLMクライアントを作成（デフォルトはgoogle）
		const client = await createClientWithUserKey({
			provider: "google",
		});

		// プロンプトを構築
		const promptTemplate = `以下のトランスクリプトから、適切なタイトルを生成してください。

要件:
- トランスクリプトの内容を簡潔に表すタイトル
- 10文字以上30文字以内
- タイトルのみを返す（説明文は不要）`;

		const prompt = buildPrompt([promptTemplate, body.transcript]);

		// LLM APIを呼び出し
		const response = await client.generate(prompt);

		if (!response || response.trim() === "") {
			throw new Error("タイトル生成に失敗しました: 内容が空です");
		}

		// タイトルを抽出（クォートや改行を削除）
		const title = response
			.trim()
			.replace(/^["']|["']$/g, "")
			.split("\n")[0]
			.trim();

		logger.info({ userId: user.id, title }, "Title generation completed");

		return NextResponse.json({ title });
	} catch (error: unknown) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to generate title",
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
			{ error: "タイトル生成中にエラーが発生しました" },
			{ status: 500 },
		);
	}
}
