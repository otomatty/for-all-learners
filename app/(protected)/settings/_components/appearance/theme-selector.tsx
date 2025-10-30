"use client";

import { useEffect } from "react";

interface ThemeSelectorProps {
	value: string;
	onChange: (value: string) => void;
}

const themes = [
	{ value: "red", label: "Red" },
	{ value: "rose", label: "Rose" },
	{ value: "orange", label: "Orange" },
	{ value: "green", label: "Green" },
	{ value: "blue", label: "Blue" },
	{ value: "yellow", label: "Yellow" },
	{ value: "violet", label: "Violet" },
];

const allThemes = [{ value: "", label: "Default" }, ...themes];

// テーマ毎のサンプルカラーを定義（CSS変数を使わず固定色で表示）
const themeColors: Record<string, string> = {
	red: "oklch(0.637 0.237 25.331)",
	rose: "oklch(0.645 0.246 16.439)",
	orange: "oklch(0.705 0.213 47.604)",
	green: "oklch(0.723 0.219 149.579)",
	blue: "oklch(0.623 0.214 259.815)",
	yellow: "oklch(0.795 0.184 86.047)",
	violet: "oklch(0.606 0.25 292.717)",
};
const defaultColor = "#ffffff";

// テーマ毎のボーダーカラーを定義
const themeBorderColors: Record<string, string> = {
	red: "oklch(0.637 0.237 25.331)",
	rose: "oklch(0.645 0.246 16.439)",
	orange: "oklch(0.705 0.213 47.604)",
	green: "oklch(0.723 0.219 149.579)",
	blue: "oklch(0.623 0.214 259.815)",
	yellow: "oklch(0.795 0.184 86.047)",
	violet: "oklch(0.606 0.25 292.717)",
};
const defaultBorderColor = "#cccccc";

export default function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
	// テーマクラス一覧を生成
	const themeClasses = themes.map((t) => `theme-${t.value}`);
	// 値が変わったら即時にHTML要素にクラスを適用
	useEffect(() => {
		const root = document.documentElement;
		// 既存テーマクラスを削除
		for (const cls of themeClasses) {
			root.classList.remove(cls);
		}
		// デフォルトでなければ新しいテーマクラスを追加
		if (value) {
			root.classList.add(`theme-${value}`);
		}
	}, [value, themeClasses]);
	// 値変更ハンドラ
	const handleChange = (newValue: string) => onChange(newValue);
	// Grid形式でテーマを一覧表示
	return (
		<div className="grid grid-cols-3 gap-4">
			{allThemes.map((theme) => (
				<button
					key={theme.value}
					type="button"
					className={`flex flex-col items-center p-3 border rounded ${
						value === theme.value ? "border-primary" : "border-border"
					}`}
					onClick={() => handleChange(theme.value)}
				>
					<div
						className="w-12 h-12 rounded"
						style={{
							backgroundColor: theme.value
								? themeColors[theme.value] || defaultColor
								: defaultColor,
							border: `2px solid ${
								theme.value
									? themeBorderColors[theme.value] || defaultBorderColor
									: defaultBorderColor
							}`,
						}}
					/>
					<span className="mt-2">{theme.label}</span>
				</button>
			))}
		</div>
	);
}
