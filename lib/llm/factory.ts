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
 *   ├─ app/_actions/ai/getUserAPIKey.ts
 *   └─ lib/logger.ts
 *
 * Related Files:
 *   ├─ Spec: ./factory.spec.md
 *   ├─ Tests: ./__tests__/factory.test.ts
 *   └─ Plan: docs/03_plans/ai-integration/20251103_04_dynamic-llm-client-implementation-plan.md
 */

import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
import logger from "@/lib/logger";
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
	const apiKey = providedApiKey ?? (await getUserAPIKey(provider));

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
