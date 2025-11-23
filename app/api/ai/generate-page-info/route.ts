/**
 * Generate Page Info API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ lib/hooks/ai/useGeneratePageInfo.ts (Phase 4.2)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/generatePageInfo.ts (移行元)
 *   ├─ lib/llm/factory.ts (createClientWithUserKey)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./route.spec.md (将来作成)
 *   └─ Tests: ./__tests__/route.test.ts (将来作成)
 */

import { type NextRequest, NextResponse } from "next/server";
import { generatePageInfo } from "@/app/_actions/generatePageInfo";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { LLMProvider } from "@/lib/llm/client";

interface GeneratePageInfoRequest {
	title: string;
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
		const body = (await request.json()) as GeneratePageInfoRequest;

		if (!body.title || typeof body.title !== "string") {
			return NextResponse.json(
				{ error: "titleは必須です" },
				{ status: 400 },
			);
		}

		if (!body.title.trim()) {
			return NextResponse.json(
				{ error: "titleが空です" },
				{ status: 400 },
			);
		}

		// providerのバリデーション
		if (
			body.provider &&
			!["google", "openai", "anthropic"].includes(body.provider)
		) {
			return NextResponse.json(
				{
					error:
						"無効なproviderです。google, openai, anthropicのいずれかを指定してください",
				},
				{ status: 400 },
			);
		}

		logger.info(
			{
				userId: user.id,
				provider: body.provider || "google",
				model: body.model,
				title: body.title,
			},
			"Starting page info generation",
		);

		// ページ情報生成
		const markdown = await generatePageInfo(body.title, {
			provider: body.provider,
			model: body.model,
		});

		logger.info(
			{ userId: user.id, markdownLength: markdown.length },
			"Page info generation completed",
		);

		return NextResponse.json({ markdown });
	} catch (error: unknown) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to generate page info",
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
			{ error: "ページ情報生成中にエラーが発生しました" },
			{ status: 500 },
		);
	}
}

