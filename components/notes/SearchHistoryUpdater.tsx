/**
 * SearchHistoryUpdater Component
 *
 * 検索実行時に検索履歴を更新するクライアントコンポーネント
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ app/(protected)/search/page.tsx
 *
 * Dependencies (依存先):
 *   ├─ lib/search/searchHistoryManager.ts
 *   └─ types/search.ts
 *
 * Related Files:
 *   └─ Plan: docs/03_plans/search-ui-improvement/20251029_03_phase2-search-history-plan.md
 */

"use client";

import { useEffect } from "react";
import { addToSearchHistory } from "@/lib/search/searchHistoryManager";

interface SearchHistoryUpdaterProps {
	/** 検索クエリ */
	query: string;
	/** 検索結果数 */
	resultsCount: number;
	/** フィルタータイプ */
	type: "all" | "card" | "page";
	/** ソート順 */
	sort: "relevance" | "updated" | "created";
}

/**
 * 検索履歴更新コンポーネント
 *
 * 検索実行時に自動的にLocalStorageの履歴を更新します。
 * Server Componentから呼び出され、検索パラメータと結果数を受け取ります。
 *
 * @example
 * <SearchHistoryUpdater
 *   query={query}
 *   resultsCount={totalResults}
 *   type={filterType}
 *   sort={sortBy}
 * />
 */
export function SearchHistoryUpdater({
	query,
	resultsCount,
	type,
	sort,
}: SearchHistoryUpdaterProps) {
	useEffect(() => {
		if (query) {
			addToSearchHistory({
				query,
				resultsCount,
				filters: {
					type,
					sort,
				},
			});
		}
	}, [query, resultsCount, type, sort]);

	// このコンポーネントは何もレンダリングしない
	return null;
}
