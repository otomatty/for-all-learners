/**
 * API Key Management API Route
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ lib/hooks/ai/useAPIKey.ts (Phase 4.2)
 *
 * Dependencies (依存先):
 *   ├─ lib/encryption/api-key-vault.ts (encryptAPIKey, decryptAPIKey)
 *   ├─ lib/llm/client.ts (createLLMClient)
 *   ├─ lib/llm/factory.ts (createClientWithUserKey)
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./route.spec.md (将来作成)
 *   └─ Tests: ./__tests__/route.test.ts (将来作成)
 */

import { type NextRequest, NextResponse } from "next/server";
import { encryptAPIKey } from "@/lib/encryption/api-key-vault";
import { createLLMClient, type LLMProvider } from "@/lib/llm/client";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
	getProviderValidationErrorMessage,
	isValidProvider,
} from "@/lib/validators/ai";

// Static export: API routes are not supported in static export mode
// This API route will be disabled during static export builds
export const dynamic = "force-static";
export const revalidate = false;

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

		// 全プロバイダーの初期状態
		const _providers: LLMProvider[] = ["google", "openai", "anthropic"];
		const status: Record<
			LLMProvider,
			{ configured: boolean; updatedAt: string | null }
		> = {
			google: { configured: false, updatedAt: null },
			openai: { configured: false, updatedAt: null },
			anthropic: { configured: false, updatedAt: null },
		};

		// データベースからAPIキー状態を取得
		const { data: apiKeys, error: dbError } = await supabase
			.from("user_api_keys")
			.select("provider, updated_at")
			.eq("user_id", user.id)
			.eq("is_active", true);

		if (dbError) {
			logger.error({ error: dbError }, "Failed to fetch API keys");
			return NextResponse.json(
				{ error: "データベースエラーが発生しました" },
				{ status: 500 },
			);
		}

		// データベース結果でマージ
		if (apiKeys) {
			for (const key of apiKeys) {
				const provider = key.provider as LLMProvider;
				if (isValidProvider(provider)) {
					status[provider] = {
						configured: true,
						updatedAt: key.updated_at || null,
					};
				}
			}
		}

		return NextResponse.json({ data: status });
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

			try {
				const testClient = await createLLMClient({
					provider: body.provider,
					apiKey: body.apiKey,
				});
				await testClient.generate("こんにちは");
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				let userMessage = "APIキーのテストに失敗しました";

				if (
					errorMessage.includes("API_KEY_INVALID") ||
					errorMessage.includes("invalid") ||
					errorMessage.includes("unauthorized") ||
					errorMessage.includes("401")
				) {
					userMessage = "APIキーが無効です";
				} else if (
					errorMessage.includes("network") ||
					errorMessage.includes("fetch") ||
					errorMessage.includes("ENOTFOUND")
				) {
					userMessage = "ネットワークエラーが発生しました";
				}

				return NextResponse.json({ error: userMessage }, { status: 400 });
			}
		}

		logger.info({ userId: user.id, provider: body.provider }, "Saving API key");

		// APIキーを暗号化
		const encryptedKey = await encryptAPIKey(body.apiKey);

		// データベースに保存（upsert）
		const { error: upsertError } = await supabase.from("user_api_keys").upsert(
			{
				user_id: user.id,
				provider: body.provider,
				encrypted_api_key: encryptedKey,
				is_active: true,
				updated_at: new Date().toISOString(),
			},
			{
				onConflict: "user_id,provider",
			},
		);

		if (upsertError) {
			logger.error({ error: upsertError }, "Failed to save API key");
			return NextResponse.json(
				{ error: "データベースエラーが発生しました" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ message: "APIキーを保存しました" });
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

		// データベースから削除
		const { error: deleteError } = await supabase
			.from("user_api_keys")
			.delete()
			.eq("user_id", user.id)
			.eq("provider", body.provider);

		if (deleteError) {
			logger.error({ error: deleteError }, "Failed to delete API key");
			return NextResponse.json(
				{ error: "データベースエラーが発生しました" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ message: "APIキーを削除しました" });
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
