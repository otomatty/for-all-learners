"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";

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
 */
export function SearchBar() {
	const [query, setQuery] = useState("");
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [activeIndex, setActiveIndex] = useState(-1);
	const router = useRouter();
	const containerRef = useRef<HTMLDivElement>(null);

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
			} catch (error) {
				console.error("[SearchBar] fetchSuggestions error:", error);
				setSuggestions([]);
			}
		}, 300),
		[],
	);

	// query が変わったら候補取得を実行
	useEffect(() => {
		fetchSuggestions(query);
	}, [query, fetchSuggestions]);

	// 入力値変更ハンドラ
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value);
	};

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
			} else {
				router.push(`/search?q=${encodeURIComponent(query)}`);
			}
		}
	};

	// 候補クリック時の遷移
	const handleSuggestionClick = (href: string) => {
		router.push(href);
	};

	// 外部クリックで候補リストを閉じる
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
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
				type="text"
				className="w-full border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring focus:border-blue-300"
				placeholder="キーワードで検索…"
				value={query}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
			/>
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
		</div>
	);
}
