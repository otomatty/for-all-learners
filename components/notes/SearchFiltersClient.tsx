/**
 * SearchFiltersClient Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルを import している場所):
 *   └─ app/(protected)/search/page.tsx
 *
 * Dependencies (このファイルが import している外部ファイル):
 *   ├─ next/navigation
 *   └─ ./SearchFilters
 *
 * Related Files:
 *   └─ Issue: docs/01_issues/open/2025_10/20251029_XX_xxx.md
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchFilters } from "./SearchFilters";

interface SearchFiltersClientProps {
	currentType: "all" | "card" | "page";
	currentSort: "relevance" | "updated" | "created";
}

export function SearchFiltersClient({
	currentType,
	currentSort,
}: SearchFiltersClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const handleParamChange = (key: "type" | "sort", value: string) => {
		const params = new URLSearchParams(searchParams);
		params.set(key, value);
		params.set("page", "1"); // ページをリセット
		router.push(`/search?${params.toString()}`);
	};

	return (
		<SearchFilters
			currentType={currentType}
			currentSort={currentSort}
			onTypeChange={(newType) => handleParamChange("type", newType)}
			onSortChange={(newSort) => handleParamChange("sort", newSort)}
		/>
	);
}
