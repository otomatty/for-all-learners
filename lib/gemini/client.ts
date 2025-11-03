/**
 * @deprecated Use createClientWithUserKey() from lib/llm/factory.ts instead
 *
 * Legacy singleton Gemini client
 * This will be removed in a future version
 *
 * Migration guide:
 * Before: import { geminiClient } from '@/lib/gemini/client';
 * After:  import { createClientWithUserKey } from '@/lib/llm/factory';
 *         const client = await createClientWithUserKey({ provider: 'google' });
 *
 * Why deprecated:
 * - Doesn't support user-configured API keys
 * - Hard-coded to environment variable only
 * - Not compatible with multi-provider architecture
 */

import { GoogleGenAI } from "@google/genai";
import logger from "@/lib/logger";

// Check if environment variable exists (for backward compatibility)
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
	logger.warn(
		"⚠️ [DEPRECATED] GEMINI_API_KEY not found. " +
			"Please configure API keys in Settings → LLM Settings, " +
			"or use createClientWithUserKey() from lib/llm/factory.ts",
	);
}

// Export singleton (null if no environment key)
// @deprecated - Use createClientWithUserKey() instead
export const geminiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;
