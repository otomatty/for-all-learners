/**
 * API Key Management API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ lib/hooks/ai/useAPIKey.ts (Phase 4.2)
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/ai/apiKey.ts (移行元)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./route.spec.md (将来作成)
 *   └─ Tests: ./__tests__/route.test.ts (将来作成)
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	deleteAPIKey,
	getAPIKeyStatus,
	saveAPIKey,
	testAPIKey,
} from "@/app/_actions/ai/apiKey";
import type { LLMProvider } from "@/lib/llm/client";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
	getProviderValidationErrorMessage,
	isValidProvider,
} from "@/lib/validators/ai";

// GET: APIキーの状態取得
export async function GET(_request: NextRequest) {
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

		logger.info({ userId: user.id }, "Getting API key status");

		const result = await getAPIKeyStatus();

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json({ data: result.data });
	} catch (error: unknown) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to get API key status",
		);

		return NextResponse.json(
			{ error: "APIキー状態の取得中にエラーが発生しました" },
			{ status: 500 },
		);
	}
}

// POST: APIキーの保存
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
		const body = (await request.json()) as {
			provider: LLMProvider;
			apiKey: string;
			test?: boolean;
		};

		if (!body.provider || typeof body.provider !== "string") {
			return NextResponse.json(
				{ error: "providerは必須です" },
				{ status: 400 },
			);
		}

		if (!isValidProvider(body.provider)) {
			return NextResponse.json(
				{
					error: getProviderValidationErrorMessage(),
				},
				{ status: 400 },
			);
		}

		if (!body.apiKey || typeof body.apiKey !== "string") {
			return NextResponse.json({ error: "apiKeyは必須です" }, { status: 400 });
		}

		// テストオプションがある場合は先にテスト
		if (body.test) {
			logger.info(
				{ userId: user.id, provider: body.provider },
				"Testing API key before saving",
			);

			const testResult = await testAPIKey(body.provider, body.apiKey);

			if (!testResult.success) {
				return NextResponse.json({ error: testResult.error }, { status: 400 });
			}
		}

		logger.info({ userId: user.id, provider: body.provider }, "Saving API key");

		const result = await saveAPIKey(body.provider, body.apiKey);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json({ message: result.message });
	} catch (error: unknown) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to save API key",
		);

		return NextResponse.json(
			{ error: "APIキーの保存中にエラーが発生しました" },
			{ status: 500 },
		);
	}
}

// DELETE: APIキーの削除
export async function DELETE(request: NextRequest) {
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
		const body = (await request.json()) as { provider: LLMProvider };

		if (!body.provider || typeof body.provider !== "string") {
			return NextResponse.json(
				{ error: "providerは必須です" },
				{ status: 400 },
			);
		}

		if (!isValidProvider(body.provider)) {
			return NextResponse.json(
				{
					error: getProviderValidationErrorMessage(),
				},
				{ status: 400 },
			);
		}

		logger.info(
			{ userId: user.id, provider: body.provider },
			"Deleting API key",
		);

		const result = await deleteAPIKey(body.provider);

		if (!result.success) {
			return NextResponse.json({ error: result.error }, { status: 500 });
		}

		return NextResponse.json({ message: result.message });
	} catch (error: unknown) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to delete API key",
		);

		return NextResponse.json(
			{ error: "APIキーの削除中にエラーが発生しました" },
			{ status: 500 },
		);
	}
}
