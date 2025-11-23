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
	useGenerateCards,
	type GeneratedCard,
	type GenerateCardsPayload,
	type GenerateCardsResponse,
} from "./useGenerateCards";

export {
	useGeneratePageInfo,
	type GeneratePageInfoPayload,
	type GeneratePageInfoResponse,
} from "./useGeneratePageInfo";

export {
	useGenerateTitle,
	type GenerateTitlePayload,
	type GenerateTitleResponse,
} from "./useGenerateTitle";

export {
	useGenerateCardsFromPage,
	type GeneratedRawCard,
	type GenerateCardsFromPagePayload,
	type GenerateCardsFromPageResponse,
} from "./useGenerateCardsFromPage";

export {
	useAPIKeyStatus,
	useSaveAPIKey,
	useDeleteAPIKey,
	type APIKeyStatus,
	type GetAPIKeyStatusResponse,
	type SaveAPIKeyPayload,
	type SaveAPIKeyResponse,
	type DeleteAPIKeyPayload,
	type DeleteAPIKeyResponse,
} from "./useAPIKey";

