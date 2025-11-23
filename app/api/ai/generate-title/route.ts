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
import { generateTitleFromTranscript } from "@/app/_actions/generateTitle";
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
			return NextResponse.json(
				{ error: "認証が必要です" },
				{ status: 401 },
			);
		}

		// リクエストボディの取得とバリデーション
		const body = (await request.json()) as GenerateTitleRequest;

		if (!body.transcript || typeof body.transcript !== "string") {
			return NextResponse.json(
				{ error: "transcriptは必須です" },
				{ status: 400 },
			);
		}

		if (!body.transcript.trim()) {
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

		// タイトル生成
		const title = await generateTitleFromTranscript(body.transcript);

		logger.info(
			{ userId: user.id, title },
			"Title generation completed",
		);

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
					{ error: "APIキーが設定されていません。設定画面でAPIキーを設定してください。" },
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

