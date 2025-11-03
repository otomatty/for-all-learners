/**
 * Get User API Key - Retrieve user-configured or fallback environment API keys
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   - app/_actions/generatePageInfo.ts (Phase 1.0)
 *   - app/_actions/ai/generateCards.ts (Phase 1.0)
 *   - components/ai/ProviderSelector.tsx (Phase 1.0)
 *
 * Dependencies (依存先):
 *   - lib/supabase/server.ts
 *   - lib/encryption/api-key-vault.ts
 *   - lib/llm/client.ts (LLMProvider型)
 *
 * Related Files:
 *   - Spec: ./getUserAPIKey.spec.md
 *   - Tests: ./__tests__/getUserAPIKey.test.ts
 */

"use server";

import { decryptAPIKey } from "@/lib/encryption/api-key-vault";
import type { LLMProvider } from "@/lib/llm/client";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Get environment variable key for provider
 * This function reads from process.env dynamically to support testing
 */
function getEnvironmentAPIKeys(): Record<LLMProvider, string | undefined> {
	return {
		google: process.env.GEMINI_API_KEY,
		openai: process.env.OPENAI_API_KEY,
		anthropic: process.env.ANTHROPIC_API_KEY,
	};
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Get API key for the specified LLM provider.
 * Prioritizes user-configured keys, falls back to environment variables.
 *
 * @param provider - LLM provider name ("google" | "openai" | "anthropic")
 * @returns Decrypted API key
 * @throws Error if API key is not configured
 *
 * @example
 * ```typescript
 * // Get user's Google Gemini API key
 * const apiKey = await getUserAPIKey("google");
 *
 * // Get OpenAI API key
 * const openaiKey = await getUserAPIKey("openai");
 * ```
 */
export async function getUserAPIKey(provider: LLMProvider): Promise<string> {
	// Validate provider
	if (!isValidProvider(provider)) {
		const error = `Invalid provider: ${provider}`;
		logger.error({ provider }, "getUserAPIKey: Invalid provider");
		throw new Error(error);
	}

	const supabase = await createClient();

	// Check authentication
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	// If not authenticated, use environment variable
	if (authError || !user) {
		logger.info(
			{ provider },
			"getUserAPIKey: Using environment variable (unauthenticated)",
		);
		return getEnvironmentAPIKey(provider);
	}

	// Query user's API key from database
	const { data, error } = await supabase
		.from("user_api_keys")
		.select("encrypted_api_key")
		.eq("user_id", user.id)
		.eq("provider", provider)
		.single();

	// If user key not found, fallback to environment variable
	if (error || !data?.encrypted_api_key) {
		logger.info(
			{ provider, userId: user.id },
			"getUserAPIKey: User key not found, using environment",
		);
		return getEnvironmentAPIKey(provider);
	}

	// Try to decrypt user's API key
	try {
		const decryptedKey = await decryptAPIKey(data.encrypted_api_key);

		logger.info(
			{ provider, userId: user.id, hasKey: !!decryptedKey },
			"getUserAPIKey: User key retrieved",
		);

		return decryptedKey;
	} catch (error) {
		logger.error(
			{
				provider,
				userId: user.id,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			"getUserAPIKey: Failed to decrypt user key",
		);

		// If decryption fails, try environment variable as fallback
		// Note: getEnvironmentAPIKey will throw a more specific error message
		// if the environment key is also not configured
		return getEnvironmentAPIKey(provider);
	}
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get API key from environment variables
 *
 * @param provider - LLM provider name
 * @returns Environment API key
 * @throws Error if environment key is not configured
 */
function getEnvironmentAPIKey(provider: LLMProvider): string {
	const keys = getEnvironmentAPIKeys();
	const key = keys[provider];

	if (!key || key.trim() === "") {
		const error = `API key not configured for provider: ${provider}. Please set it in Settings.`;
		logger.error({ provider }, "getEnvironmentAPIKey: No key configured");
		throw new Error(error);
	}

	return key;
}

/**
 * Validate if the provider is valid
 *
 * @param provider - Provider to validate
 * @returns True if valid provider
 */
function isValidProvider(provider: string): provider is LLMProvider {
	return ["google", "openai", "anthropic"].includes(provider);
}
