"use client";

import { debounce } from "lodash";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchHistory } from "@/hooks/use-search-history";
import type { SearchHistoryItem } from "@/types/search";
import { SearchHistoryDropdown } from "./SearchHistoryDropdown";

/**
 * 検索候補の型定義
 */
interface Suggestion {
	/** 候補の種別 */
	type: "card" | "page";
	/** 元レコードのID (UUID) */
	id: string;
	/** 表示テキスト */
	text: string;
	/** 遷移先のURL */
	href: string;
}

/**
 * SearchBar コンポーネント
 * クライアントサイドでキーワード入力を監視し、
 * エッジ API にデバウンス付きリクエストを飛ばして
 * 検索候補を取得・表示します。
 *
 * Phase 2-A: 検索履歴機能追加
 * - フォーカス時に検索履歴を表示
 * - 履歴から1クリックで再検索
 * - 個別削除・全削除機能
 *
 * Phase 2-B: モーダル対応
 * - onNavigate: 検索実行時のコールバック（モーダルを閉じる用）
 * - autoFocus: 自動フォーカス
 * - placeholder: プレースホルダーテキスト
 */

interface SearchBarProps {
	/** 検索実行時のコールバック（モーダルを閉じる等） */
	onNavigate?: () => void;
	/** 自動フォーカス */
	autoFocus?: boolean;
	/** プレースホルダーテキスト */
	placeholder?: string;
}

export function SearchBar({
	onNavigate,
	autoFocus = false,
	placeholder = "キーワードで検索…",
}: SearchBarProps = {}) {
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [isFocused, setIsFocused] = useState(false);
	const router = useRouter();
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// 検索履歴の取得・操作
	const { history, addToHistory, removeFromHistory, clearHistory } =
		useSearchHistory();

	// デバウンス付きで候補をフェッチ
	const fetchSuggestions = useCallback(
		debounce(async (value: string) => {
			if (!value) {
				setSuggestions([]);
				return;
			}
			try {
				const res = await fetch(
					`/api/search-suggestions?q=${encodeURIComponent(value)}`,
				);
				if (!res.ok) {
					setSuggestions([]);
					return;
				}
				const data: Suggestion[] = await res.json();
				setSuggestions(data);
				setActiveIndex(-1);
			} catch {
				// Silently fail for production
				setSuggestions([]);
			}
		}, 300),
		[],
	);

	// query が変わったら候補取得を実行
	useEffect(() => {
		fetchSuggestions(query);
	}, [query, fetchSuggestions]);

	// autoFocus プロパティが true の場合、マウント時にフォーカス
	useEffect(() => {
		if (autoFocus && inputRef.current) {
			inputRef.current.focus();
		}
	}, [autoFocus]);

	// 入力値変更ハンドラ
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value);
	};

	// 検索実行（履歴に追加）
	const handleSearch = useCallback(
		(searchQuery: string) => {
			if (!searchQuery.trim()) return;

			// 履歴に追加
			addToHistory({
				query: searchQuery,
			});

			// 検索ページに遷移
			router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
			setIsFocused(false);
			setSuggestions([]);

			// モーダルを閉じる（モーダル内で使用時）
			onNavigate?.();
		},
		[router, addToHistory, onNavigate],
	);

	// キーボード操作対応
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((prev) => (prev + 1) % suggestions.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex(
				(prev) => (prev - 1 + suggestions.length) % suggestions.length,
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (activeIndex >= 0) {
				router.push(suggestions[activeIndex].href);
				onNavigate?.();
			} else {
				handleSearch(query);
			}
		} else if (e.key === "Escape") {
			// Escキーで履歴を閉じる
			setIsFocused(false);
			setSuggestions([]);
			inputRef.current?.blur();
		}
	};

	// 候補クリック時の遷移
	const handleSuggestionClick = (href: string) => {
		router.push(href);
		setIsFocused(false);
		setSuggestions([]);
		onNavigate?.();
	};

	// 履歴から選択
	const handleSelectHistory = useCallback(
		(item: SearchHistoryItem) => {
			setQuery(item.query);
			handleSearch(item.query);
		},
		[handleSearch],
	);

	// 外部クリックで候補リストと履歴を閉じる
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsFocused(false);
				setSuggestions([]);
				setActiveIndex(-1);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	return (
		<div className="relative w-full" ref={containerRef}>
			<input
				ref={inputRef}
				type="text"
				className="w-full border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring focus:border-blue-300"
				placeholder={placeholder}
				value={query}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				onFocus={() => setIsFocused(true)}
			/>

			{/* サジェスト候補（入力時） */}
			{suggestions.length > 0 && (
				<ul className="absolute z-10 w-full bg-white border border-gray-200 rounded mt-1 max-h-60 overflow-auto shadow-md">
					{suggestions.map((s, idx) => (
						<li
							key={`${s.type}-${s.id}`}
							className={`px-3 py-2 cursor-pointer ${
								idx === activeIndex ? "bg-blue-100" : "hover:bg-gray-100"
							}`}
							onMouseEnter={() => setActiveIndex(idx)}
							onClick={() => handleSuggestionClick(s.href)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleSuggestionClick(s.href);
								}
							}}
						>
							{s.text}
						</li>
					))}
				</ul>
			)}

			{/* 検索履歴（フォーカス時＆未入力時） */}
			<SearchHistoryDropdown
				history={history}
				onSelectHistory={handleSelectHistory}
				onRemoveHistory={removeFromHistory}
				onClearHistory={clearHistory}
				isVisible={isFocused && query.length === 0}
			/>
		</div>
	);
}
