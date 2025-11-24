/**
 * Dynamic LLM Client Factory - Wrapper for createLLMClient with getUserAPIKey
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ app/_actions/generatePageInfo.ts
 *   ├─ app/_actions/ai/generateCards.ts
 *   ├─ app/_actions/ai/generateCardsFromPage.ts
 *   └─ lib/gemini.ts (generateQuestions)
 *
 * Dependencies (依存先):
 *   ├─ lib/llm/client.ts (createLLMClient)
 *   ├─ lib/supabase/client.ts (createClient)
 *   ├─ lib/encryption/api-key-vault.ts (decryptAPIKey)
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./factory.spec.md
 *   ├─ Tests: ./__tests__/factory.test.ts
 *   └─ Plan: docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md
 */

import { decryptAPIKey } from "@/lib/encryption/api-key-vault";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import { createLLMClient, type LLMClient, type LLMProvider } from "./client";

// ============================================================================
// Type Definitions
// ============================================================================

export interface CreateClientWithUserKeyOptions {
	provider: LLMProvider;
	model?: string;
	apiKey?: string; // Optional: if not provided, will fetch from getUserAPIKey
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user API key from database
 * Falls back to environment variable if not found
 */
async function getUserAPIKeyFromDatabase(
	provider: LLMProvider,
): Promise<string> {
	try {
		const supabase = createClient();
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			// Fallback to environment variable if not authenticated
			return getEnvironmentAPIKey(provider);
		}

		// Get encrypted API key from database
		const { data, error } = await supabase
			.from("user_api_keys")
			.select("encrypted_api_key")
			.eq("user_id", user.id)
			.eq("provider", provider)
			.eq("is_active", true)
			.single();

		if (error || !data) {
			// Fallback to environment variable if not found
			return getEnvironmentAPIKey(provider);
		}

		// Decrypt API key
		const decrypted = await decryptAPIKey(data.encrypted_api_key);
		return decrypted;
	} catch (error) {
		logger.warn(
			{
				provider,
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to get user API key from database, falling back to environment variable",
		);
		// Fallback to environment variable on error
		return getEnvironmentAPIKey(provider);
	}
}

/**
 * Get API key from environment variables
 */
function getEnvironmentAPIKey(provider: LLMProvider): string {
	const envKeys: Record<LLMProvider, string | undefined> = {
		google: process.env.GEMINI_API_KEY,
		openai: process.env.OPENAI_API_KEY,
		anthropic: process.env.ANTHROPIC_API_KEY,
	};

	const key = envKeys[provider];
	if (!key) {
		throw new Error(
			`API key not configured for provider: ${provider}. Please set environment variable or configure user API key.`,
		);
	}

	return key;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create LLM client with automatic API key resolution
 *
 * This function:
 * 1. Uses provided API key if available
 * 2. Otherwise, fetches user-configured key from database
 * 3. Falls back to environment variable if no user key
 * 4. Creates appropriate client based on provider
 *
 * @param options - Client creation options
 * @param options.provider - LLM provider ("google" | "openai" | "anthropic")
 * @param options.model - Model name (optional, uses provider default if not specified)
 * @param options.apiKey - API key (optional, will fetch from getUserAPIKey if not provided)
 * @returns LLM client instance
 * @throws Error if API key is not available
 *
 * @example
 * ```typescript
 * // Auto-fetch user's Google API key
 * const client = await createClientWithUserKey({ provider: "google" });
 * const response = await client.generate("Hello");
 *
 * // With specific model
 * const client = await createClientWithUserKey({
 *   provider: "openai",
 *   model: "gpt-4o"
 * });
 *
 * // With explicit API key (bypass user settings)
 * const client = await createClientWithUserKey({
 *   provider: "anthropic",
 *   apiKey: "sk-ant-..."
 * });
 * ```
 */
export async function createClientWithUserKey(
	options: CreateClientWithUserKeyOptions,
): Promise<LLMClient> {
	const { provider, model, apiKey: providedApiKey } = options;

	logger.info(
		{ provider, model, hasProvidedApiKey: !!providedApiKey },
		"createClientWithUserKey: Starting client creation",
	);

	// Get API key (use provided or fetch from user settings/env)
	const apiKey = providedApiKey ?? (await getUserAPIKeyFromDatabase(provider));

	logger.info(
		{ provider, model, hasApiKey: !!apiKey },
		"createClientWithUserKey: API key resolved",
	);

	// Use existing createLLMClient
	try {
		const client = await createLLMClient({ provider, model, apiKey });

		logger.info(
			{ provider, model },
			"createClientWithUserKey: Client created successfully",
		);

		return client;
	} catch (error) {
		logger.error(
			{
				provider,
				model,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			"createClientWithUserKey: Failed to create client",
		);
		throw error;
	}
}
