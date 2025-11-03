/**
 * API Key Management Server Actions
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   - app/(protected)/settings/api-keys/page.tsx (Phase 0.5 - 未実装)
 *   - components/settings/APIKeyForm.tsx (Phase 0.5 - 未実装)
 *   - components/ai/APIKeyPrompt.tsx (Phase 0.5 - 未実装)
 *
 * Dependencies (依存先):
 *   - lib/encryption/api-key-vault.ts (Phase 0.2)
 *   - lib/llm/client.ts (Phase 0.3)
 *   - lib/supabase/server.ts
 *   - @supabase/supabase-js
 *
 * Related Files:
 *   - Spec: ./apiKey.spec.md
 *   - Tests: ./__tests__/apiKey.test.ts
 */

"use server";

import { encryptAPIKey } from "@/lib/encryption/api-key-vault";
import { createLLMClient, type LLMProvider } from "@/lib/llm/client";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Type Definitions
// ============================================================================

export type SaveAPIKeyResult =
	| { success: true; message: string }
	| { success: false; error: string };

export type DeleteAPIKeyResult =
	| { success: true; message: string }
	| { success: false; error: string };

export type TestAPIKeyResult =
	| { success: true; message: string }
	| { success: false; error: string };

export interface APIKeyStatus {
	configured: boolean;
	updatedAt: string | null;
}

export type GetAPIKeyStatusResult =
	| { success: true; data: Record<LLMProvider, APIKeyStatus> }
	| { success: false; error: string };

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate LLM provider
 */
function isValidProvider(provider: string): provider is LLMProvider {
	return ["google", "openai", "anthropic"].includes(provider);
}

/**
 * Get authenticated user
 */
async function getAuthenticatedUser() {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		throw new Error("ログインが必要です");
	}

	return user;
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Save encrypted API key to database
 *
 * @param provider - LLM provider
 * @param apiKey - Plain text API key
 * @returns Success or error result
 */
export async function saveAPIKey(
	provider: LLMProvider,
	apiKey: string,
): Promise<SaveAPIKeyResult> {
	try {
		// Validate inputs
		if (!provider || !isValidProvider(provider)) {
			return { success: false, error: "無効なプロバイダーです" };
		}

		if (!apiKey || apiKey.trim().length === 0) {
			return { success: false, error: "APIキーを入力してください" };
		}

		// Authenticate user
		const user = await getAuthenticatedUser();

		// Encrypt API key
		const encryptedKey = await encryptAPIKey(apiKey);

		// Save to database
		const supabase = await createClient();
		const { error: dbError } = await supabase.from("user_api_keys").upsert(
			{
				user_id: user.id,
				provider,
				encrypted_api_key: encryptedKey,
				updated_at: new Date().toISOString(),
			},
			{
				onConflict: "user_id,provider",
			},
		);

		if (dbError) {
			logger.error({ dbError }, "Database error in saveAPIKey");
			return { success: false, error: "データベースエラーが発生しました" };
		}

		return { success: true, message: "APIキーを保存しました" };
	} catch (error) {
		logger.error({ error }, "Error in saveAPIKey");
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "APIキーの保存に失敗しました",
		};
	}
}

/**
 * Get API key configuration status for all providers
 *
 * @returns Status for all providers
 */
export async function getAPIKeyStatus(): Promise<GetAPIKeyStatusResult> {
	try {
		// Authenticate user
		const user = await getAuthenticatedUser();

		// Query database
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("user_api_keys")
			.select("provider, updated_at")
			.eq("user_id", user.id);

		if (error) {
			logger.error({ error }, "Database error in getAPIKeyStatus");
			return { success: false, error: "データベースエラーが発生しました" };
		}

		// Build status object for all providers
		const statusMap: Record<LLMProvider, APIKeyStatus> = {
			google: { configured: false, updatedAt: null },
			openai: { configured: false, updatedAt: null },
			anthropic: { configured: false, updatedAt: null },
		};

		// Fill in configured providers
		for (const row of data || []) {
			const providerKey = row.provider as string;
			if (isValidProvider(providerKey)) {
				statusMap[providerKey] = {
					configured: true,
					updatedAt: row.updated_at,
				};
			}
		}

		return { success: true, data: statusMap };
	} catch (error) {
		logger.error({ error }, "Error in getAPIKeyStatus");
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "ステータスの取得に失敗しました",
		};
	}
}

/**
 * Delete API key from database
 *
 * @param provider - LLM provider
 * @returns Success or error result
 */
export async function deleteAPIKey(
	provider: LLMProvider,
): Promise<DeleteAPIKeyResult> {
	try {
		// Validate provider
		if (!provider || !isValidProvider(provider)) {
			return { success: false, error: "無効なプロバイダーです" };
		}

		// Authenticate user
		const user = await getAuthenticatedUser();

		// Delete from database
		const supabase = await createClient();
		const { error } = await supabase
			.from("user_api_keys")
			.delete()
			.eq("user_id", user.id)
			.eq("provider", provider);

		if (error) {
			logger.error({ error }, "Database error in deleteAPIKey");
			return { success: false, error: "データベースエラーが発生しました" };
		}

		return { success: true, message: "APIキーを削除しました" };
	} catch (error) {
		logger.error({ error }, "Error in deleteAPIKey");
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "APIキーの削除に失敗しました",
		};
	}
}

/**
 * Test if API key is valid by making a test request
 *
 * @param provider - LLM provider
 * @param apiKey - API key to test
 * @returns Success or error result
 */
export async function testAPIKey(
	provider: LLMProvider,
	apiKey: string,
): Promise<TestAPIKeyResult> {
	try {
		// Validate inputs
		if (!provider || !isValidProvider(provider)) {
			return { success: false, error: "無効なプロバイダーです" };
		}

		if (!apiKey || apiKey.trim().length === 0) {
			return { success: false, error: "APIキーを入力してください" };
		}

		// Authenticate user
		await getAuthenticatedUser();

		// Create LLM client
		const client = await createLLMClient({
			provider,
			apiKey,
		});

		// Test with simple prompt
		const response = await client.generate("こんにちは", {
			maxTokens: 100,
			temperature: 0.7,
		});

		// Check if response is valid
		if (!response || response.trim().length === 0) {
			return {
				success: false,
				error: "APIキーは有効ですが、レスポンスが空です",
			};
		}

		return { success: true, message: "APIキーは有効です" };
	} catch (error) {
		logger.error({ error }, "Error in testAPIKey");

		// Provide user-friendly error messages
		const errorMessage = error instanceof Error ? error.message : String(error);

		if (
			errorMessage.includes("API_KEY_INVALID") ||
			errorMessage.includes("invalid") ||
			errorMessage.includes("unauthorized") ||
			errorMessage.includes("401")
		) {
			return {
				success: false,
				error: `APIキーが無効です。エラー: ${errorMessage}`,
			};
		}

		if (
			errorMessage.includes("network") ||
			errorMessage.includes("fetch") ||
			errorMessage.includes("ENOTFOUND")
		) {
			return { success: false, error: "ネットワークエラーが発生しました" };
		}

		return {
			success: false,
			error: `APIキーのテストに失敗しました: ${errorMessage}`,
		};
	}
}
