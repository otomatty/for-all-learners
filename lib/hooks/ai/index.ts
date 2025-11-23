/**
 * AI処理関連のカスタムフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ (将来の使用箇所)
 *
 * Dependencies (External files that this file imports):
 *   └─ 各フックファイル
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 4.2)
 */

export {
	type APIKeyStatus,
	type DeleteAPIKeyPayload,
	type DeleteAPIKeyResponse,
	type GetAPIKeyStatusResponse,
	type SaveAPIKeyPayload,
	type SaveAPIKeyResponse,
	useAPIKeyStatus,
	useDeleteAPIKey,
	useSaveAPIKey,
} from "./useAPIKey";
export {
	type GenerateCardsPayload,
	type GenerateCardsResponse,
	type GeneratedCard,
	useGenerateCards,
} from "./useGenerateCards";
export {
	type GenerateCardsFromPagePayload,
	type GenerateCardsFromPageResponse,
	type GeneratedRawCard,
	useGenerateCardsFromPage,
} from "./useGenerateCardsFromPage";
export {
	type GeneratePageInfoPayload,
	type GeneratePageInfoResponse,
	useGeneratePageInfo,
} from "./useGeneratePageInfo";
export {
	type GenerateTitlePayload,
	type GenerateTitleResponse,
	useGenerateTitle,
} from "./useGenerateTitle";
