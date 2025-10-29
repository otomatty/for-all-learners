/**
 * TypeFilter Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   └─ components/notes/SearchFilters.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   └─ @/components/ui/tabs
 *
 * Related Files:
 *   └─ Issue: docs/01_issues/open/2025_10/20251029_XX_xxx.md
 */

"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 許可されたタイプの定義
const allowedTypes = ["all", "card", "page"] as const;
type NoteType = (typeof allowedTypes)[number];

// 型ガード関数
function isValidType(value: string): value is NoteType {
	return allowedTypes.includes(value as NoteType);
}

interface TypeFilterProps {
	value: NoteType;
	onChange: (value: NoteType) => void;
}

export function TypeFilter({ value, onChange }: TypeFilterProps) {
	const handleChange = (newValue: string) => {
		if (isValidType(newValue)) {
			onChange(newValue);
		}
	};

	return (
		<Tabs value={value} onValueChange={handleChange} className="w-auto">
			<TabsList>
				<TabsTrigger value="all">すべて</TabsTrigger>
				<TabsTrigger value="card">カード</TabsTrigger>
				<TabsTrigger value="page">ページ</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}
