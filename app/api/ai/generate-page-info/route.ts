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
import type { LLMProvider } from "@/lib/llm/client";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { buildPrompt } from "@/lib/llm/prompt-builder";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
	getProviderValidationErrorMessage,
	isValidProvider,
} from "@/lib/validators/ai";

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
			return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
		}

		// リクエストボディの取得とバリデーション
		const body = (await request.json()) as GeneratePageInfoRequest;

		if (typeof body.title !== "string") {
			return NextResponse.json({ error: "titleは必須です" }, { status: 400 });
		}

		if (!body.title || body.title.trim() === "") {
			return NextResponse.json({ error: "titleが空です" }, { status: 400 });
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
				title: body.title,
			},
			"Starting page info generation",
		);

		// LLMクライアントを作成
		const client = await createClientWithUserKey({
			provider,
			model: body.model,
		});

		// プロンプトを構築
		const promptTemplate = `以下のタイトルについて、Markdown形式で解説ドキュメントを生成してください。

要件:
- タイトルに関する基本的な説明を含める
- 重要な概念やキーワードを説明
- 実用例やコード例を含める（該当する場合）
- 見出し（## 以降）を使用して構造化
- 最初の行はH1ヘッディング（# タイトル）を含めない`;

		const prompt = buildPrompt([promptTemplate, body.title]);

		// LLM APIを呼び出し
		const response = await client.generate(prompt);

		if (!response || response.trim() === "") {
			throw new Error("ページ情報生成に失敗しました: 内容が空です");
		}

		// コードフェンスから抽出（ある場合）
		let markdown = response.trim();
		const fenceMatch =
			response.match(/```markdown\s*([\s\S]*?)```/i) ||
			response.match(/```md\s*([\s\S]*?)```/i);
		if (fenceMatch?.[1]) {
			markdown = fenceMatch[1].trim();
		}

		// 先頭のH1ヘッディングを削除
		markdown = markdown.replace(/^#\s+.*$/m, "").trim();

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
			{ error: "ページ情報生成中にエラーが発生しました" },
			{ status: 500 },
		);
	}
}
