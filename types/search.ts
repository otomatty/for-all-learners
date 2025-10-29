/**
 * Search-related type definitions
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ lib/search/searchHistoryManager.ts
 *   ├─ hooks/use-search-history.ts
 *   ├─ components/notes/SearchHistoryDropdown.tsx
 *   └─ app/(protected)/search/page.tsx
 *
 * Dependencies: None (基本型定義のみ)
 *
 * Related Files:
 *   └─ Plan: docs/03_plans/search-ui-improvement/20251029_03_phase2-search-history-plan.md
 */

/**
 * 検索履歴の1アイテムを表す型
 */
export interface SearchHistoryItem {
	/** UUID */
	id: string;
	/** 検索クエリ */
	query: string;
	/** Unix timestamp (ms) */
	timestamp: number;
	/** 検索結果数（オプション） */
	resultsCount?: number;
	/** 使用したフィルター（オプション） */
	filters?: {
		/** タイプフィルター */
		type?: "all" | "card" | "page";
		/** ソート順 */
		sort?: "relevance" | "updated" | "created";
	};
}

/**
 * LocalStorageに保存する検索履歴全体の型
 */
export interface SearchHistoryStore {
	/** 履歴アイテムの配列 */
	items: SearchHistoryItem[];
	/** 最大保存件数 */
	maxItems: number;
}
