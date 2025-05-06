"use client";

import React, { useEffect, useRef } from "react";

interface ThemeSelectorProps {
	value: string;
	onChange: (value: string) => void;
}

const themes = [
	{ value: "ocean", label: "海 (Ocean)" },
	{ value: "forest", label: "森 (Forest)" },
	{ value: "sunset", label: "夕暮れ (Sunset)" },
	{ value: "night-sky", label: "夜空 (Night Sky)" },
	{ value: "desert", label: "砂漠 (Desert)" },
];

const allThemes = [{ value: "", label: "デフォルト" }, ...themes];

// テーマ毎のサンプルカラーを定義（CSS変数を使わず固定色で表示）
const themeColors: Record<string, string> = {
	ocean: "#0288D1",
	forest: "#388E3C",
	sunset: "#FB8C00",
	"night-sky": "#3949AB",
	desert: "#FFB300",
};
const defaultColor = "#ffffff";

// テーマ毎のボーダーカラーを定義
const themeBorderColors: Record<string, string> = {
	ocean: "#01579b",
	forest: "#1b5e20",
	sunset: "#e65100",
	"night-sky": "#0d47a1",
	desert: "#ff6f00",
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
