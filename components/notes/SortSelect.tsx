/**
 * SortSelect Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   └─ components/notes/SearchFilters.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   └─ @/components/ui/select
 *
 * Related Files:
 *   └─ Issue: docs/01_issues/open/2025_10/20251029_XX_xxx.md
 */

"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// 許可されたソート順の定義
const allowedSorts = ["relevance", "updated", "created"] as const;
type SortType = (typeof allowedSorts)[number];

// 型ガード関数
function isValidSort(value: string): value is SortType {
	return allowedSorts.includes(value as SortType);
}

interface SortSelectProps {
	value: SortType;
	onChange: (value: SortType) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
	const handleChange = (newValue: string) => {
		if (isValidSort(newValue)) {
			onChange(newValue);
		}
	};

	return (
		<Select value={value} onValueChange={handleChange}>
			<SelectTrigger className="w-[180px]">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="relevance">関連度順</SelectItem>
				<SelectItem value="updated">更新日順</SelectItem>
				<SelectItem value="created">作成日順</SelectItem>
			</SelectContent>
		</Select>
	);
}
