/**
 * AI関連のバリデーション関数
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/api/ai/* (各API Route)
 *
 * Dependencies (External files that this file imports):
 *   └─ @/lib/llm/client
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.2)
 */

import type { LLMProvider } from "@/lib/llm/client";

export const VALID_PROVIDERS: LLMProvider[] = ["google", "openai", "anthropic"];

/**
 * Providerが有効かどうかをチェックする
 *
 * @param provider - チェックするprovider
 * @returns providerが有効な場合true、そうでない場合false
 */
export function isValidProvider(provider: unknown): provider is LLMProvider {
	return (
		typeof provider === "string" &&
		VALID_PROVIDERS.includes(provider as LLMProvider)
	);
}

/**
 * Providerバリデーションエラーメッセージを生成する
 *
 * @returns エラーメッセージ
 */
export function getProviderValidationErrorMessage(): string {
	return `無効なproviderです。${VALID_PROVIDERS.join(", ")}のいずれかを指定してください`;
}
