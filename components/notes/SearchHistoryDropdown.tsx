/**
 * SearchHistoryDropdown Component
 *
 * 検索履歴を表示・操作するドロップダウンコンポーネント
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ components/notes/SearchBar.tsx
 *
 * Dependencies (依存先):
 *   ├─ types/search.ts
 *   ├─ lucide-react (Clock, X, Trash2)
 *   └─ date-fns (formatDistanceToNow, ja)
 *
 * Related Files:
 *   └─ Plan: docs/03_plans/search-ui-improvement/20251029_03_phase2-search-history-plan.md
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Clock, Trash2, X } from "lucide-react";
import type { SearchHistoryItem } from "@/types/search";

interface SearchHistoryDropdownProps {
	/** 検索履歴の配列 */
	history: SearchHistoryItem[];
	/** 履歴選択時のコールバック */
	onSelectHistory: (item: SearchHistoryItem) => void;
	/** 履歴削除時のコールバック */
	onRemoveHistory: (id: string) => void;
	/** 履歴全削除時のコールバック */
	onClearHistory: () => void;
	/** ドロップダウンの表示状態 */
	isVisible: boolean;
}

/**
 * 検索履歴ドロップダウン
 *
 * 検索バーの下に表示され、過去の検索を一覧表示します。
 * 各履歴をクリックすると再検索が実行されます。
 *
 * @example
 * <SearchHistoryDropdown
 *   history={history}
 *   onSelectHistory={handleSelectHistory}
 *   onRemoveHistory={removeFromHistory}
 *   onClearHistory={clearHistory}
 *   isVisible={isFocused && query.length === 0}
 * />
 */
export function SearchHistoryDropdown({
	history,
	onSelectHistory,
	onRemoveHistory,
	onClearHistory,
	isVisible,
}: SearchHistoryDropdownProps) {
	// 非表示または履歴が空の場合は何も表示しない
	if (!isVisible || history.length === 0) {
		return null;
	}

	return (
		<div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
			{/* ヘッダー */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
					<Clock className="w-4 h-4" />
					<span>最近の検索</span>
				</div>
				<button
					type="button"
					onClick={onClearHistory}
					className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 transition-colors"
				>
					<Trash2 className="w-4 h-4" />
					全て削除
				</button>
			</div>

			{/* 履歴リスト */}
			<ul className="py-2">
				{history.map((item) => (
					<li
						key={item.id}
						className="group hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					>
						<button
							type="button"
							onClick={() => onSelectHistory(item)}
							className="w-full px-4 py-2 text-left flex items-center justify-between gap-2"
						>
							<div className="flex-1 min-w-0">
								{/* クエリテキスト */}
								<div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
									{item.query}
								</div>
								{/* メタ情報 */}
								<div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
									<span>
										{formatDistanceToNow(item.timestamp, {
											addSuffix: true,
											locale: ja,
										})}
									</span>
									{item.resultsCount !== undefined && (
										<span>• {item.resultsCount}件</span>
									)}
									{item.filters?.type && item.filters.type !== "all" && (
										<span>
											• {item.filters.type === "card" ? "カード" : "ページ"}
										</span>
									)}
								</div>
							</div>
							{/* 削除ボタン */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onRemoveHistory(item.id);
								}}
								className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity"
								aria-label="この履歴を削除"
							>
								<X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
							</button>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
