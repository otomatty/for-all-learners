/**
 * Search History Manager
 *
 * LocalStorageを使用した検索履歴の管理関数群
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ hooks/use-search-history.ts
 *   └─ app/(protected)/search/page.tsx
 *
 * Dependencies (依存先):
 *   ├─ types/search.ts (SearchHistoryItem, SearchHistoryStore)
 *   └─ lib/logger.ts (logger)
 *
 * Related Files:
 *   ├─ Plan: docs/03_plans/search-ui-improvement/20251029_03_phase2-search-history-plan.md
 *   └─ Tests: lib/search/__tests__/searchHistoryManager.test.ts (TODO)
 */

import logger from "@/lib/logger";
import type { SearchHistoryItem, SearchHistoryStore } from "@/types/search";

const STORAGE_KEY = "for-all-learners:search-history";
const MAX_ITEMS = 10;

/**
 * 検索履歴を取得
 *
 * LocalStorageから検索履歴を読み込みます。
 *
 * @returns 検索履歴の配列（新しい順）
 */
export function getSearchHistory(): SearchHistoryItem[] {
	// SSR環境では空配列を返す
	if (typeof window === "undefined") return [];

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];

		const data: SearchHistoryStore = JSON.parse(stored);
		return data.items || [];
	} catch (error) {
		logger.error({ error }, "Failed to load search history");
		return [];
	}
}

/**
 * 検索履歴に追加
 *
 * - 同じクエリが既に存在する場合は削除してから追加（最上位に移動）
 * - 最大件数を超えた場合は最古のアイテムを削除
 *
 * @param item - 追加する検索履歴（id と timestamp は自動生成）
 */
export function addToSearchHistory(
	item: Omit<SearchHistoryItem, "id" | "timestamp">,
): void {
	// SSR環境では何もしない
	if (typeof window === "undefined") return;

	try {
		const history = getSearchHistory();

		// 同じクエリが既に存在する場合は削除
		const filtered = history.filter((h) => h.query !== item.query);

		// 新しいアイテムを先頭に追加
		const newItem: SearchHistoryItem = {
			id: crypto.randomUUID(),
			timestamp: Date.now(),
			...item,
		};

		// 最大件数まで切り詰め
		const newHistory = [newItem, ...filtered].slice(0, MAX_ITEMS);

		const store: SearchHistoryStore = {
			items: newHistory,
			maxItems: MAX_ITEMS,
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch (error) {
		logger.error({ error }, "Failed to save search history");
	}
}

/**
 * 特定の履歴を削除
 *
 * @param id - 削除する履歴のID
 */
export function removeFromSearchHistory(id: string): void {
	// SSR環境では何もしない
	if (typeof window === "undefined") return;

	try {
		const history = getSearchHistory();
		const filtered = history.filter((item) => item.id !== id);

		const store: SearchHistoryStore = {
			items: filtered,
			maxItems: MAX_ITEMS,
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch (error) {
		logger.error({ error }, "Failed to remove search history");
	}
}

/**
 * 履歴を全てクリア
 */
export function clearSearchHistory(): void {
	// SSR環境では何もしない
	if (typeof window === "undefined") return;

	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (error) {
		logger.error({ error }, "Failed to clear search history");
	}
}
