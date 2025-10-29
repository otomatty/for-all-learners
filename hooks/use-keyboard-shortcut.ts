/**
 * useKeyboardShortcut Hook
 *
 * キーボードショートカットを登録するカスタムフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ components/notes/SearchModal.tsx
 *
 * Dependencies: None (React標準のみ)
 *
 * Related Files:
 *   └─ Plan: docs/03_plans/search-ui-improvement/20251029_04_phase2b-advanced-features-plan.md
 */

import { useEffect } from "react";

interface UseKeyboardShortcutOptions {
	/** トリガーとなるキー */
	key: string;
	/** Macの Command キー（⌘） */
	metaKey?: boolean;
	/** Windows/Linux の Ctrl キー */
	ctrlKey?: boolean;
	/** Shift キー */
	shiftKey?: boolean;
	/** Alt キー */
	altKey?: boolean;
	/** ショートカットがトリガーされた時のコールバック */
	onTrigger: () => void;
	/** フックを無効化するフラグ */
	disabled?: boolean;
}

/**
 * キーボードショートカットを登録するカスタムフック
 *
 * グローバルなキーボードショートカットを簡単に登録できます。
 * Mac/Windows の両プラットフォーム対応。
 *
 * @example
 * // Cmd+K (Mac) / Ctrl+K (Windows) でモーダルを開く
 * useKeyboardShortcut({
 *   key: "k",
 *   metaKey: true,
 *   ctrlKey: true,
 *   onTrigger: () => setIsOpen(true),
 * });
 *
 * @example
 * // Shift+? でヘルプを表示
 * useKeyboardShortcut({
 *   key: "?",
 *   shiftKey: true,
 *   onTrigger: () => setShowHelp(true),
 * });
 */
export function useKeyboardShortcut({
	key,
	metaKey = false,
	ctrlKey = false,
	shiftKey = false,
	altKey = false,
	onTrigger,
	disabled = false,
}: UseKeyboardShortcutOptions) {
	useEffect(() => {
		if (disabled) return;

		const handler = (e: KeyboardEvent) => {
			// 入力フィールドにフォーカスがある場合はスキップ（Cmd+K等は例外）
			const target = e.target as HTMLElement;
			const isInputField =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.contentEditable === "true";

			// Cmd+K / Ctrl+K は入力フィールドでも動作させる
			const isSearchShortcut =
				key.toLowerCase() === "k" && (metaKey || ctrlKey);

			if (isInputField && !isSearchShortcut) {
				return;
			}

			// キーの一致確認
			const keyMatches = e.key.toLowerCase() === key.toLowerCase();

			// 修飾キーの確認
			// metaKey と ctrlKey はプラットフォーム依存で OR 条件
			const modifierMatches =
				(metaKey || ctrlKey ? e.metaKey || e.ctrlKey : true) &&
				(shiftKey ? e.shiftKey : true) &&
				(altKey ? e.altKey : true);

			if (keyMatches && modifierMatches) {
				e.preventDefault();
				onTrigger();
			}
		};

		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [key, metaKey, ctrlKey, shiftKey, altKey, onTrigger, disabled]);
}
