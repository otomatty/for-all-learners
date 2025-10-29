/**
 * SearchModal Component
 *
 * グローバル検索モーダル（Cmd+K / Ctrl+K で開く）
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ app/layout.tsx (グローバルに配置予定)
 *
 * Dependencies (依存先):
 *   ├─ components/ui/dialog.tsx
 *   ├─ components/notes/SearchBar.tsx
 *   ├─ hooks/use-keyboard-shortcut.ts
 *   └─ lucide-react (Search, Command)
 *
 * Related Files:
 *   └─ Plan: docs/03_plans/search-ui-improvement/20251029_04_phase2b-advanced-features-plan.md
 */

"use client";

import { Command } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { SearchBar } from "./SearchBar";

/**
 * グローバル検索モーダル
 *
 * Cmd+K (Mac) / Ctrl+K (Windows) で開閉できる検索UI。
 * どのページからでもアクセス可能。
 *
 * @example
 * // app/layout.tsx に配置
 * <SearchModal />
 */
export function SearchModal() {
	const [isOpen, setIsOpen] = useState(false);

	// Cmd+K / Ctrl+K でモーダルを開く
	useKeyboardShortcut({
		key: "k",
		metaKey: true,
		ctrlKey: true,
		onTrigger: () => setIsOpen(true),
	});

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="max-w-3xl p-0 gap-0">
				{/* ヘッダー */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center gap-2">
						<Command className="w-5 h-5 text-gray-500 dark:text-gray-400" />
						<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
							検索
						</h2>
					</div>
					<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
						<span>閉じる:</span>
						<kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
							Esc
						</kbd>
					</div>
				</div>

				{/* 検索バー */}
				<div className="p-6">
					<SearchBar
						onNavigate={() => setIsOpen(false)}
						autoFocus
						placeholder="カードやページを検索... (Cmd+K)"
					/>
				</div>

				{/* フッター（ヒント） */}
				<div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
					<div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
						<div className="flex items-center gap-1">
							<kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
								↑
							</kbd>
							<kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
								↓
							</kbd>
							<span>選択</span>
						</div>
						<div className="flex items-center gap-1">
							<kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
								Enter
							</kbd>
							<span>決定</span>
						</div>
						<div className="flex items-center gap-1">
							<kbd className="px-1.5 py-0.5 font-mono bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">
								Esc
							</kbd>
							<span>閉じる</span>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
