/**
 * useSearchHistory Hook
 *
 * 検索履歴の状態管理とLocalStorage操作を提供するカスタムフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ components/notes/SearchBar.tsx
 *
 * Dependencies (依存先):
 *   ├─ lib/search/searchHistoryManager.ts
 *   └─ types/search.ts
 *
 * Related Files:
 *   └─ Plan: docs/03_plans/search-ui-improvement/20251029_03_phase2-search-history-plan.md
 */

import { useCallback, useEffect, useState } from "react";
import {
	addToSearchHistory,
	clearSearchHistory,
	getSearchHistory,
	removeFromSearchHistory,
} from "@/lib/search/searchHistoryManager";
import type { SearchHistoryItem } from "@/types/search";

/**
 * 検索履歴を管理するカスタムフック
 *
 * LocalStorageと同期した検索履歴の状態管理を提供します。
 *
 * @returns 検索履歴の操作関数とデータ
 *
 * @example
 * const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
 *
 * // 検索実行時
 * addToHistory({ query: "React", resultsCount: 10 });
 *
 * // 履歴から削除
 * removeFromHistory(item.id);
 *
 * // 全て削除
 * clearHistory();
 */
export function useSearchHistory() {
	const [history, setHistory] = useState<SearchHistoryItem[]>([]);

	// 初期ロード: LocalStorageから履歴を読み込む
	useEffect(() => {
		setHistory(getSearchHistory());
	}, []);

	// 履歴に追加
	const addToHistory = useCallback(
		(item: Omit<SearchHistoryItem, "id" | "timestamp">) => {
			addToSearchHistory(item);
			setHistory(getSearchHistory());
		},
		[],
	);

	// 履歴から削除
	const removeFromHistory = useCallback((id: string) => {
		removeFromSearchHistory(id);
		setHistory(getSearchHistory());
	}, []);

	// 履歴をクリア
	const clearHistory = useCallback(() => {
		clearSearchHistory();
		setHistory([]);
	}, []);

	return {
		history,
		addToHistory,
		removeFromHistory,
		clearHistory,
	};
}
